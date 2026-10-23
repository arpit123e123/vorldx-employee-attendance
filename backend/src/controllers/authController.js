
import prisma from "../config/prisma.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { auditAdminAction } from "../utils/auditAdminAction.js";
import crypto from 'node:crypto';

const DUMMY_PASSWORD_HASH = bcrypt.hashSync("not-a-real-account-password", 12);

function generateToken(userId) {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is missing from environment variables");
  }

  return jwt.sign(
    { userId },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1d", algorithm: "HS256" }
  );
}

function publicUser(user) {
  return {
    id: user.id,
    employeeId: user.employeeId,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    companyId: user.companyId || null,
    isCompanyOwner: Boolean(user.isCompanyOwner)
  };
}

export async function login(req, res, next) {
  try {
    const { employeeId, email, password } = req.body || {};
    const normalizedEmployeeId = typeof employeeId === "string"
      ? employeeId.trim().toUpperCase()
      : "";
    const normalizedEmail = typeof email === "string"
      ? email.trim().toLowerCase()
      : "";

    if (
      typeof password !== "string" ||
      !password ||
      Buffer.byteLength(password, "utf8") > 72 ||
      (!normalizedEmployeeId && !normalizedEmail)
    ) {
      return res.status(400).json({
        success: false,
        message: "Employee ID or email and password are required"
      });
    }

    if (normalizedEmployeeId && normalizedEmail) {
      return res.status(400).json({
        success: false,
        message: "Provide either Employee ID or email, not both"
      });
    }

    const validEmployeeId = normalizedEmployeeId.length <= 50 && /^[A-Z0-9-]+$/.test(normalizedEmployeeId);
    const validEmail = normalizedEmail.length <= 254 && /^\S+@\S+\.\S+$/.test(normalizedEmail);
    if ((!validEmployeeId && normalizedEmployeeId) || (!validEmail && normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Enter valid login details.",
      });
    }

    const user = normalizedEmployeeId
      ? await prisma.user.findFirst({
          where: {
            employeeId: normalizedEmployeeId
          },
          include: { company: { select: { isActive: true } } }
        })
      : await prisma.user.findFirst({
          where: {
            email: normalizedEmail
          },
          include: { company: { select: { isActive: true } } }
        });

    const passwordMatches = await bcrypt.compare(
      password,
      user?.password || DUMMY_PASSWORD_HASH
    );

    if (!user || !user.isActive || !passwordMatches || (user.companyId && !user.company?.isActive)) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    if (!['employee', 'admin', 'hr'].includes(user.role)) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (["admin", "hr"].includes(user.role)) {
      await auditAdminAction(req, {
        action: "admin.login",
        targetType: "session",
        metadata: { method: normalizedEmployeeId ? "employee_id" : "email" },
        actorId: user.id,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        token: generateToken(user.id),
        user: publicUser(user)
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    return res.status(200).json({
      success: true,
      data: { user: publicUser(user) }
    });
  } catch (error) {
    next(error);
  }
}

export async function registerCompany(req, res, next) {
  try {
    const { companyName, name, email, password } = req.body || {};
    const company = typeof companyName === 'string' ? companyName.trim() : '';
    const person = typeof name === 'string' ? name.trim() : '';
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!company || company.length > 120 || !person || person.length > 80 || !/^\S+@\S+\.\S+$/.test(normalizedEmail) || normalizedEmail.length > 254 || typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({ success: false, message: 'Company, name, valid email, and password (12 to 72 bytes) are required.' });
    }
    const slug = `${company.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120) || 'company'}-${crypto.randomBytes(4).toString('hex')}`;
    let employeeId;
    do { employeeId = `VWX-${crypto.randomInt(100000, 1_000_000)}`; }
    while (await prisma.user.findUnique({ where: { employeeId }, select: { id: true } }));
    const created = await prisma.$transaction(async (tx) => {
      if (await tx.user.findUnique({ where: { email: normalizedEmail } })) {
        const error = new Error('This email is already registered.'); error.statusCode = 409; throw error;
      }
      if (await tx.user.findUnique({ where: { employeeId } })) {
        const error = new Error('Could not allocate an employee ID. Please retry.'); error.statusCode = 409; throw error;
      }
      const companyRecord = await tx.company.create({ data: { name: company, slug, email: normalizedEmail } });
      const owner = await tx.user.create({ data: { employeeId, name: person, email: normalizedEmail, password: await bcrypt.hash(password, 12), role: 'admin', isActive: true, companyId: companyRecord.id, isCompanyOwner: true } });
      return { company: companyRecord, owner };
    });
    return res.status(201).json({ success: true, message: 'Company registered. You can now sign in.', data: { company: { id: created.company.id, name: created.company.name }, user: { email: created.owner.email, employeeId: created.owner.employeeId } } });
  } catch (error) {
    if (error.code === 'P2002') return res.status(409).json({ success: false, message: 'This email is already registered.' });
    next(error);
  }
}
