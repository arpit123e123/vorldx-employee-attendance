
import crypto from "crypto";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";
import asyncHandler from "../utils/asyncHandler.js";
import { auditAdminAction } from "../utils/auditAdminAction.js";

const QR_VALIDITY_SECONDS = 60;
const LATE_GRACE_MINUTES = 15;

function getArrivalDetails(dateString, startTime, checkInTime) {
  const [year, month, day] = dateString.split("-").map(Number);
  const [hour, minute] = startTime.split(":").map(Number);

  const scheduled = new Date(
    year,
    month - 1,
    day,
    hour,
    minute
  );

  const graceEnd = new Date(
    scheduled.getTime() + LATE_GRACE_MINUTES * 60000
  );

  const late = checkInTime > graceEnd;

  return {
    arrivalStatus: late ? "late" : "on-time",
    lateMinutes: late
      ? Math.ceil((checkInTime - graceEnd) / 60000)
      : 0,
    shiftName: null,
    shiftStartTime: startTime,
    gracePeriodMinutes: LATE_GRACE_MINUTES
  };
}

export const createQRDisplaySession = asyncHandler(
  async (req, res) => {
    const configured = process.env.QR_DISPLAY_SECRET;
    const provided = req.body?.secret;

    if (!configured || !process.env.JWT_SECRET) {
      return res.status(503).json({
        success: false,
        message: "QR display authentication is not configured."
      });
    }

    if (typeof provided !== "string" || !provided.length || provided.length > 256) {
      return res.status(401).json({
        success: false,
        message: "Display credentials are required."
      });
    }

    const expectedBuffer = Buffer.from(configured);
    const providedBuffer = Buffer.from(provided);

    if (
      expectedBuffer.length !== providedBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, providedBuffer)
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid display credentials."
      });
    }

    const token = jwt.sign(
      { type: "qr-display" },
      process.env.JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.cookie("qrDisplaySession", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/qr",
      maxAge: 8 * 60 * 60 * 1000
    });

    return res.status(200).json({
      success: true,
      message: "QR display session created."
    });
  }
);

export const generateQR = asyncHandler(async (req, res) => {
  const isDisplay = req.qrDisplay === true;
  let createdBy;

  if (isDisplay) {
    const ownerId = process.env.QR_DISPLAY_CREATED_BY_USER_ID;

    const ownerWhere = {
      isActive: true,
      role: { in: ["admin", "hr"] }
    };
    const owner = ownerId
      ? await prisma.user.findFirst({
          where: { ...ownerWhere, id: ownerId }
        }) || await prisma.user.findFirst({
          where: ownerWhere,
          orderBy: { createdAt: "asc" }
        })
      : await prisma.user.findFirst({
          where: ownerWhere,
          orderBy: { createdAt: "asc" }
        });

    if (!owner) {
      return res.status(503).json({
        success: false,
        message: "Valid active Admin/HR display owner not found."
      });
    }

    createdBy = owner.id;
  } else {
    if (!req.user || !["admin", "hr"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Only Admin/HR can generate attendance QR."
      });
    }

    createdBy = req.user.id;
  }

  const shifts = await prisma.shift.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      startTime: true,
      endTime: true
    }
  });

  if (shifts.length === 0) {
    return res.status(404).json({
      success: false,
      message: "No active shifts found. Create and activate a shift before generating an attendance QR."
    });
  }

  const rawToken = crypto.randomBytes(32).toString("base64url");

  const tokenHash = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  const expiresAt = new Date(
    Date.now() + QR_VALIDITY_SECONDS * 1000
  );

  await prisma.qrSession.deleteMany({
    where: { expiresAt: { lte: new Date() } }
  });

  await prisma.qrSession.create({
    data: {
      tokenHash,
      shifts: {
        connect: shifts.map(shift => ({ id: shift.id }))
      },
      createdBy,
      expiresAt,
      isActive: true
    },
    select: { id: true }
  });

  if (!isDisplay) {
    await auditAdminAction(req, {
      action: "attendance_qr.generate",
      targetType: "qr_session",
      metadata: { shiftCount: shifts.length },
      actorId: createdBy,
    });
  }

  return res.status(201).json({
    success: true,
    message: "Attendance QR generated.",
    data: {
      token: rawToken,
      shifts,
      expiresAt,
      validitySeconds: QR_VALIDITY_SECONDS
    }
  });
});

export const verifyQR = asyncHandler(async (req, res) => {
  const { token } = req.body || {};

  if (typeof token !== "string" || token.length < 20) {
    return res.status(400).json({
      success: false,
      message: "Valid QR token is required."
    });
  }

  const tokenHash = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  const session = await prisma.qrSession.findFirst({
    where: {
      tokenHash,
      isActive: true,
      expiresAt: { gt: new Date() }
    },
    include: {
      shifts: { select: { id: true } }
    }
  });

  if (!session) {
    return res.status(400).json({
      success: false,
      message: "QR invalid or expired. Scan a fresh QR."
    });
  }

  const shift = await prisma.shift.findFirst({
    where: {
      id: { in: session.shifts.map(item => item.id) },
      isActive: true,
      assignedEmployees: {
        some: { id: req.user.id }
      }
    }
  });

  if (!shift) {
    return res.status(403).json({
      success: false,
      message: "No assigned active shift matches this QR."
    });
  }

  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("-");

  const attendance = await prisma.attendance.findUnique({
    where: {
      employee_date: {
        employee: req.user.id,
        date
      }
    }
  });

  if (!attendance) {
    const details = getArrivalDetails(
      date,
      shift.startTime,
      now
    );

    details.shiftName = shift.name;

    let createdAttendance;

    try {
      createdAttendance = await prisma.attendance.create({
        data: {
          employee: req.user.id,
          ...(req.user.companyId ? { companyId: req.user.companyId } : {}),
          date,
          checkIn: now,
          status: "present",
          ...details
        }
      });
    } catch (error) {
      if (error.code === "P2002") {
        return res.status(409).json({
          success: false,
          message: "Attendance already exists for today."
        });
      }

      throw error;
    }

    return res.status(201).json({
      success: true,
      action: "check-in",
      message:
        details.arrivalStatus === "late"
          ? `Late check-in recorded. You are ${details.lateMinutes} minute(s) late after the grace period.`
          : "Check-in recorded successfully.",
      data: {
        attendance: createdAttendance,
        arrival: {
          status: details.arrivalStatus,
          lateMinutes: details.lateMinutes,
          gracePeriodMinutes: LATE_GRACE_MINUTES,
          shiftName: shift.name,
          shiftStartTime: shift.startTime
        }
      }
    });
  }

  if (attendance.checkOut) {
    return res.status(409).json({
      success: false,
      message: "You have already checked out today."
    });
  }

  const scheduledEnd = getShiftEnd(
    attendance.date,
    shift.startTime,
    shift.endTime
  );

  if (now < scheduledEnd) {
    return res.status(403).json({
      success: false,
      message: "Early checkout is not allowed without HR/Admin approval.",
      scheduledCheckoutTime: scheduledEnd.toISOString()
    });
  }

  const updated = await prisma.attendance.updateMany({
    where: {
      id: attendance.id,
      checkOut: null
    },
    data: { checkOut: now }
  });

  if (updated.count === 0) {
    return res.status(409).json({
      success: false,
      message: "Attendance has already been checked out."
    });
  }

  const updatedAttendance = await prisma.attendance.findUnique({
    where: { id: attendance.id }
  });

  return res.status(200).json({
    success: true,
    action: "check-out",
    message: "Check-out recorded successfully.",
    data: { attendance: updatedAttendance }
  });
});

function getShiftEnd(dateString, startTime, endTime) {
  const [year, month, day] = dateString.split("-").map(Number);
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);

  const end = new Date(year, month - 1, day, eh, em);

  if (eh * 60 + em <= sh * 60 + sm) {
    end.setDate(end.getDate() + 1);
  }

  return end;
}
