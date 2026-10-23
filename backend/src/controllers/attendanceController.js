
import prisma from "../config/prisma.js";
import asyncHandler from "../utils/asyncHandler.js";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function getLocalDate(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function isValidDate(value) {
  if (typeof value !== "string" || !DATE_REGEX.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function getShiftEnd(dateString, startTime, endTime) {
  const [year, month, day] = dateString.split("-").map(Number);
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);

  const end = new Date(year, month - 1, day, eh, em);

  // Overnight shifts end on the following day.
  if (eh * 60 + em <= sh * 60 + sm) {
    end.setDate(end.getDate() + 1);
  }

  return end;
}

async function getEmployeeShift(employeeId) {
  const shifts = await prisma.shift.findMany({
    where: {
      isActive: true,
      assignedEmployees: {
        some: { id: employeeId }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  if (shifts.length === 0) return null;

  if (shifts.length > 1) {
    const error = new Error(
      "Multiple active shifts are assigned. Please contact HR."
    );
    error.statusCode = 409;
    throw error;
  }

  return shifts[0];
}

export const checkIn = asyncHandler(async (req, res) => {
  const employeeId = req.user.id;
  const date = getLocalDate();
  const now = new Date();

  const shift = await getEmployeeShift(employeeId);

  if (!shift) {
    return res.status(400).json({
      success: false,
      message: "No active shift assigned. Please contact HR."
    });
  }

  try {
    const attendance = await prisma.attendance.create({
      data: {
        employee: employeeId,
        ...(req.user.companyId ? { companyId: req.user.companyId } : {}),
        date,
        checkIn: now,
        status: "present"
      }
    });

    return res.status(201).json({
      success: true,
      message: "Check-in recorded successfully.",
      data: {
        attendance,
        shift: {
          name: shift.name,
          startTime: shift.startTime,
          endTime: shift.endTime
        }
      }
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        message: "Attendance has already been checked in today."
      });
    }

    throw error;
  }
});

export const checkOut = asyncHandler(async (req, res) => {
  const employeeId = req.user.id;
  const date = getLocalDate();
  const now = new Date();

  const attendance = await prisma.attendance.findUnique({
    where: {
      employee_date: {
        employee: employeeId,
        date
      }
    }
  });

  if (!attendance) {
    return res.status(404).json({
      success: false,
      message: "No check-in found for today."
    });
  }

  if (attendance.checkOut) {
    return res.status(409).json({
      success: false,
      message: "You have already checked out."
    });
  }

  const shift = await getEmployeeShift(employeeId);

  if (!shift) {
    return res.status(400).json({
      success: false,
      message: "No active shift assigned. Please contact HR."
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
      message: "You have already checked out."
    });
  }

  const updatedAttendance = await prisma.attendance.findUnique({
    where: { id: attendance.id }
  });

  return res.status(200).json({
    success: true,
    message: "Check-out recorded successfully.",
    data: { attendance: updatedAttendance }
  });
});

export const getAttendanceHistory = asyncHandler(async (req, res) => {
  const { from, to } = req.query;

  if (
    (from && !isValidDate(from)) ||
    (to && !isValidDate(to))
  ) {
    return res.status(400).json({
      success: false,
      message: "Dates must use YYYY-MM-DD format."
    });
  }

  if (from && to && from > to) {
    return res.status(400).json({
      success: false,
      message: "'from' cannot be later than 'to'."
    });
  }

  const where = { employee: req.user.id };

  if (from || to) {
    where.date = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {})
    };
  }

  const records = await prisma.attendance.findMany({
    where,
    orderBy: { date: "desc" }
  });

  return res.status(200).json({
    success: true,
    count: records.length,
    data: { records }
  });
});

export const getAttendanceSummary = asyncHandler(async (req, res) => {
  const month =
    req.query.month || getLocalDate().slice(0, 7);

  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return res.status(400).json({
      success: false,
      message: "Month must use YYYY-MM format."
    });
  }

  const records = await prisma.attendance.findMany({
    where: {
      employee: req.user.id,
      date: {
        gte: `${month}-01`,
        lte: `${month}-31`
      }
    }
  });

  const present = records.filter(
    record => record.status === "present"
  ).length;

  const halfDay = records.filter(
    record => record.status === "half-day"
  ).length;

  const absent = records.filter(
    record => record.status === "absent"
  ).length;

  const totalMilliseconds = records.reduce((sum, record) => {
    if (!record.checkIn || !record.checkOut) return sum;

    return (
      sum +
      (new Date(record.checkOut).getTime() -
        new Date(record.checkIn).getTime())
    );
  }, 0);

  const totalMinutes = Math.floor(totalMilliseconds / 60000);

  return res.status(200).json({
    success: true,
    data: {
      month,
      present,
      absent,
      halfDay,
      totalHours: Math.floor(totalMinutes / 60),
      remainingMinutes: totalMinutes % 60,
      recordsCount: records.length
    }
  });
});

export const getAdminAttendanceRecords = asyncHandler(async (req, res) => {
  const { from, to, employeeId, arrivalStatus } = req.query;

  if (
    (from && !isValidDate(from)) ||
    (to && !isValidDate(to))
  ) {
    return res.status(400).json({
      success: false,
      message: "Dates must use YYYY-MM-DD format."
    });
  }

  if (from && to && from > to) {
    return res.status(400).json({
      success: false,
      message: "'from' cannot be later than 'to'."
    });
  }

  if (from && to) {
    const fromDate = new Date(`${from}T00:00:00`);
    const toDate = new Date(`${to}T00:00:00`);
    if (toDate.getTime() - fromDate.getTime() > 365 * 86400000) {
      return res.status(400).json({
        success: false,
        message: "Attendance record ranges cannot exceed one year.",
      });
    }
  }

  if (arrivalStatus && !["on-time", "late"].includes(arrivalStatus)) {
    return res.status(400).json({
      success: false,
      message: "arrivalStatus must be 'on-time' or 'late'."
    });
  }

  const where = {};
  if (req.user.companyId) where.companyId = req.user.companyId;

  if (from || to) {
    where.date = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {})
    };
  }

  if (employeeId && (typeof employeeId !== "string" || employeeId.length > 50)) {
    return res.status(400).json({ success: false, message: "employeeId is invalid." });
  }
  if (employeeId) where.employee = employeeId;
  if (arrivalStatus) where.arrivalStatus = arrivalStatus;

  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 500);
  if (!Number.isSafeInteger(page) || page < 1 || page > 10_000 ||
      !Number.isSafeInteger(limit) || limit < 1 || limit > 500) {
    return res.status(400).json({
      success: false,
      message: "page must be 1–10000 and limit must be 1–500.",
    });
  }

  const [records, total] = await Promise.all([
    prisma.attendance.findMany({
      where,
      include: {
        employeeUser: {
          select: {
            id: true,
            employeeId: true,
            name: true,
            email: true,
            isActive: true
          }
        }
      },
      orderBy: [{ date: "desc" }, { checkIn: "desc" }, { id: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.attendance.count({ where }),
  ]);

  return res.status(200).json({
    success: true,
    count: records.length,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasMore: page * limit < total,
    },
    data: {
      records: records.map(({ employeeUser, ...record }) => ({
        ...record,
        employee: employeeUser
      }))
    }
  });
});
