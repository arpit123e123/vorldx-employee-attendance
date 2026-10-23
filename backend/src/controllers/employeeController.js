
import prisma from "../config/prisma.js";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { auditAdminAction } from "../utils/auditAdminAction.js";

export async function createEmployee(req, res, next) {
  try {
    const { name, email, password } = req.body || {};

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !name.trim() ||
      !email.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required"
      });
    }

    if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
      return res.status(400).json({
        success: false,
        message: "Password must be 8 to 72 UTF-8 bytes long"
      });
    }

    if (name.trim().length > 80 || email.trim().length > 254 || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid name and email address."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (
      await prisma.user.findUnique({
        where: { email: normalizedEmail }
      })
    ) {
      return res.status(409).json({
        success: false,
        message: "Email is already registered"
      });
    }

    let employeeId;
    let attempts = 0;

    do {
      employeeId = `VWX-${crypto.randomInt(100000, 1_000_000)}`;

      attempts++;

      if (attempts > 10) {
        throw new Error("Could not generate a unique Employee ID");
      }
    } while (
      await prisma.user.findUnique({
        where: { employeeId }
      })
    );

    const requestedRole = req.body?.role;
    if (requestedRole && !['employee', 'hr', 'admin'].includes(requestedRole)) {
      return res.status(400).json({ success: false, message: 'Role must be employee, hr, or admin.' });
    }
    if (requestedRole !== 'employee' && requestedRole && (!req.user.isCompanyOwner || !req.user.companyId)) {
      return res.status(403).json({ success: false, message: 'Only the company owner can assign Admin and HR roles.' });
    }
    const user = await prisma.user.create({
      data: {
        employeeId,
        name: name.trim(),
        email: normalizedEmail,
        password: await bcrypt.hash(password, 12),
        role: req.user.isCompanyOwner && req.user.companyId && ['hr', 'admin'].includes(requestedRole) ? requestedRole : 'employee',
        isActive: true,
        ...(req.user.companyId ? { companyId: req.user.companyId } : {})
      }
    });

    await auditAdminAction(req, {
      action: "employee.create",
      targetType: "employee",
      targetId: user.id,
      metadata: { isActive: user.isActive },
    });

    return res.status(201).json({
      success: true,
      message: "Employee created successfully",
      data: {
        employee: {
          id: user.id,
          employeeId: user.employeeId,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive
        }
      }
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Email or Employee ID is already registered"
      });
    }

    next(error);
  }
}

export async function getEmployees(req, res, next) {
  try {
    const employees = await prisma.user.findMany({
      where: { role: { in: ["employee", "hr", "admin"] }, ...(req.user.companyId ? { companyId: req.user.companyId } : {}) },
      select: {
        id: true,
        employeeId: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true
      },
      orderBy: { createdAt: "desc" }
    });

    return res.status(200).json({
      success: true,
      count: employees.length,
      data: { employees }
    });
  } catch (error) {
    next(error);
  }
}

export async function updateEmployeeStatus(req, res, next) {
  try {
    const { isActive } = req.body || {};

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be a boolean value"
      });
    }

    const existing = await prisma.user.findFirst({
      where: { id: req.params.id, role: { in: ["employee", "hr"] }, ...(req.user.companyId ? { companyId: req.user.companyId } : {}) },
      select: { id: true }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Employee not found"
      });
    }

    const employee = await prisma.user.update({
      where: { id: existing.id },
      data: { isActive },
      select: {
        id: true,
        employeeId: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    });

    await auditAdminAction(req, {
      action: "employee.status.update",
      targetType: "employee",
      targetId: employee.id,
      metadata: { isActive },
    });

    return res.status(200).json({
      success: true,
      message: `Employee ${isActive ? "activated" : "deactivated"} successfully`,
      data: { employee }
    });
  } catch (error) {
    next(error);
  }
}

export async function updateEmployeeRole(req, res, next) {
  try {
    const { role } = req.body || {};
    if (!['employee', 'hr', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role must be employee, hr, or admin.' });
    }
    if (req.params.id === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot change your own role.' });
    }
    if (!req.user.isCompanyOwner || !req.user.companyId) return res.status(403).json({ success: false, message: 'Only your company owner can assign Admin and HR roles.' });
    const existing = await prisma.user.findFirst({ where: { id: req.params.id, companyId: req.user.companyId, role: { not: 'admin' } }, select: { id: true, role: true, isCompanyOwner: true } });
    if (!existing || !['employee', 'hr'].includes(existing.role)) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }
    const user = await prisma.user.update({
      where: { id: existing.id }, data: { role },
      select: { id: true, employeeId: true, name: true, email: true, role: true, isActive: true }
    });
    await auditAdminAction(req, { action: 'employee.role.update', targetType: 'employee', targetId: user.id, metadata: { previousRole: existing.role, role } });
    return res.status(200).json({ success: true, message: 'User role updated successfully.', data: { employee: user } });
  } catch (error) { next(error); }
}
