
import prisma from "../config/prisma.js";
import asyncHandler from "../utils/asyncHandler.js";
import { auditAdminAction } from "../utils/auditAdminAction.js";

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export const createShift = asyncHandler(async (req, res) => {
  const { name, startTime, endTime, assignedEmployees } = req.body || {};

  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof startTime !== "string" ||
    typeof endTime !== "string"
  ) {
    return res.status(400).json({
      success: false,
      message: "Name, start time and end time are required."
    });
  }

  if (!TIME_REGEX.test(startTime) || !TIME_REGEX.test(endTime)) {
    return res.status(400).json({
      success: false,
      message: "Time must be in HH:mm format, for example 09:30."
    });
  }

  if (startTime === endTime) {
    return res.status(400).json({
      success: false,
      message: "Shift start time and end time cannot be the same."
    });
  }

  if (name.trim().length > 80) {
    return res.status(400).json({
      success: false,
      message: "Shift name cannot exceed 80 characters."
    });
  }

  if (
    assignedEmployees !== undefined &&
    !Array.isArray(assignedEmployees)
  ) {
    return res.status(400).json({
      success: false,
      message: "assignedEmployees must be an array of employee IDs."
    });
  }

  if ((assignedEmployees || []).length > 2000) {
    return res.status(400).json({
      success: false,
      message: "A shift can be assigned to at most 2,000 employees at once.",
    });
  }

  const ids = [...new Set(assignedEmployees || [])];

  if (ids.some(id => typeof id !== "string" || !id.trim() || id.length > 50)) {
    return res.status(400).json({
      success: false,
      message: "One or more employee IDs are invalid."
    });
  }

  if (ids.length) {
    const users = await prisma.user.findMany({
      where: {
        id: { in: ids },
        role: "employee",
        isActive: true,
        ...(req.user.companyId ? { companyId: req.user.companyId } : {})
      },
      select: { id: true }
    });

    if (users.length !== ids.length) {
      return res.status(400).json({
        success: false,
        message: "One or more employees do not exist or are inactive."
      });
    }
  }

  const shift = await prisma.shift.create({
    data: {
      name: name.trim(),
      startTime,
      endTime,
      createdBy: req.user.id,
      ...(req.user.companyId ? { companyId: req.user.companyId } : {}),
      assignedEmployees: {
        connect: ids.map(id => ({ id }))
      }
    },
    include: {
      assignedEmployees: {
        select: {
          id: true,
          name: true,
          email: true,
          employeeId: true
        }
      }
    }
  });

  await auditAdminAction(req, {
    action: "shift.create",
    targetType: "shift",
    targetId: shift.id,
    metadata: { assignedEmployeeCount: ids.length },
  });

  return res.status(201).json({
    success: true,
    message: "Shift created successfully.",
    data: {
      shift: {
        ...shift,
        assignedEmployees: shift.assignedEmployees.map(
          employee => employee.id
        )
      }
    }
  });
});

export const getAllShifts = asyncHandler(async (req, res) => {
  const shifts = await prisma.shift.findMany({
    where: req.user.companyId ? { companyId: req.user.companyId } : {},
    include: {
      assignedEmployees: {
        select: {
          id: true,
          name: true,
          email: true,
          employeeId: true
        }
      },
      createdByUser: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return res.status(200).json({
    success: true,
    count: shifts.length,
    data: {
      shifts: shifts.map(shift => ({
        ...shift,
        assignedEmployees: shift.assignedEmployees.map(
          ({ id, name, email, employeeId }) => ({
            id,
            name,
            email,
            employeeId
          })
        ),
        createdBy: shift.createdByUser,
        createdByUser: undefined
      }))
    }
  });
});

export const getMyShift = asyncHandler(async (req, res) => {
  const shifts = await prisma.shift.findMany({
    where: {
      isActive: true,
      assignedEmployees: {
        some: { id: req.user.id }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  if (shifts.length === 0) {
    return res.status(200).json({
      success: true,
      message: "No active shift assigned.",
      data: { shift: null }
    });
  }

  if (shifts.length > 1) {
    return res.status(409).json({
      success: false,
      message: "Multiple active shifts are assigned. Please contact HR."
    });
  }

  const shift = shifts[0];

  return res.status(200).json({
    success: true,
    data: {
      shift: {
        id: shift.id,
        name: shift.name,
        startTime: shift.startTime,
        endTime: shift.endTime
      }
    }
  });
});

export const updateShiftStatus = asyncHandler(async (req, res) => {
  const { isActive } = req.body || {};

  if (typeof isActive !== "boolean") {
    return res.status(400).json({
      success: false,
      message: "isActive must be a boolean value."
    });
  }

  const existing = await prisma.shift.findUnique({
    where: { id: req.params.id, ...(req.user.companyId ? { companyId: req.user.companyId } : {}) },
    select: { id: true }
  });

  if (!existing) {
    return res.status(404).json({
      success: false,
      message: "Shift not found."
    });
  }

  const shift = await prisma.shift.update({
    where: { id: existing.id },
    data: { isActive },
    include: {
      assignedEmployees: {
        select: { id: true, name: true, email: true, employeeId: true }
      }
    }
  });

  await auditAdminAction(req, {
    action: "shift.status.update",
    targetType: "shift",
    targetId: shift.id,
    metadata: { isActive },
  });

  return res.status(200).json({
    success: true,
    message: `Shift ${isActive ? "activated" : "deactivated"} successfully.`,
    data: { shift }
  });
});
