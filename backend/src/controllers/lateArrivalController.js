
import prisma from "../config/prisma.js";
import asyncHandler from "../utils/asyncHandler.js";

const GRACE_MINUTES = 15;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

function getLocalDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isValidDate(dateString) {
  if (typeof dateString !== "string" || !DATE_REGEX.test(dateString)) return false;
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function isWeekday(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  const dayOfWeek = new Date(year, month - 1, day).getDay();

  return dayOfWeek >= 1 && dayOfWeek <= 5;
}

function getWeekdaysInMonth(month) {
  const [year, monthNumber] = month.split("-").map(Number);
  const totalDays = new Date(year, monthNumber, 0).getDate();
  const dates = [];

  for (let day = 1; day <= totalDays; day++) {
    const date = [
      year,
      String(monthNumber).padStart(2, "0"),
      String(day).padStart(2, "0")
    ].join("-");

    if (isWeekday(date)) dates.push(date);
  }

  return dates;
}

function calculateArrival(record, shift) {
  if (!record) {
    return {
      status: "absent",
      lateMinutes: 0,
      checkIn: null,
      checkOut: null
    };
  }

  if (record.arrivalStatus) {
    return {
      status: record.arrivalStatus,
      lateMinutes:
        record.arrivalStatus === "late"
          ? Number(record.lateMinutes || 0)
          : 0,
      checkIn: record.checkIn,
      checkOut: record.checkOut
    };
  }

  const startTime = record.shiftStartTime || shift?.startTime;

  if (!startTime || !record.checkIn) {
    return {
      status: "unknown",
      lateMinutes: 0,
      checkIn: record.checkIn || null,
      checkOut: record.checkOut || null
    };
  }

  const [year, month, day] = record.date.split("-").map(Number);
  const [hour, minute] = startTime.split(":").map(Number);

  const scheduledStart = new Date(
    year,
    month - 1,
    day,
    hour,
    minute
  );

  const graceEnd = new Date(
    scheduledStart.getTime() + GRACE_MINUTES * 60000
  );

  const checkIn = new Date(record.checkIn);
  const late = checkIn > graceEnd;

  return {
    status: late ? "late" : "on-time",
    lateMinutes: late
      ? Math.ceil((checkIn.getTime() - graceEnd.getTime()) / 60000)
      : 0,
    checkIn,
    checkOut: record.checkOut || null
  };
}

async function getAssignedEmployees() {
  const employees = await prisma.user.findMany({
    where: { role: "employee", isActive: true },
    select: {
      id: true,
      employeeId: true,
      name: true,
      email: true,
      assignedShifts: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          startTime: true,
          endTime: true
        }
      }
    },
    orderBy: { name: "asc" }
  });

  return employees.map(toEmployeeInfo);
}

function toEmployeeInfo({ assignedShifts, ...employee }) {
  return {
    employee,
    shift: assignedShifts.length === 1 ? assignedShifts[0] : null,
    hasShiftConflict: assignedShifts.length > 1,
  };
}

async function getEmployeeInfo(employeeId) {
  const employee = await prisma.user.findFirst({
    where: { id: employeeId, role: "employee", isActive: true },
    select: {
      id: true,
      employeeId: true,
      name: true,
      email: true,
      assignedShifts: {
        where: { isActive: true },
        select: { id: true, name: true, startTime: true, endTime: true },
      },
    },
  });
  return employee ? toEmployeeInfo(employee) : null;
}

function getDailyEmployeeStatus(employeeInfo, date, record = null) {
  const { employee, shift, hasShiftConflict } = employeeInfo;

  let arrival;

  if (hasShiftConflict) {
    arrival = {
      status: "shift-conflict",
      lateMinutes: 0,
      checkIn: record?.checkIn || null,
      checkOut: record?.checkOut || null
    };
  } else if (!record && !isWeekday(date)) {
    arrival = {
      status: "weekend",
      lateMinutes: 0,
      checkIn: null,
      checkOut: null
    };
  } else if (!record && !shift) {
    arrival = {
      status: "no-active-shift",
      lateMinutes: 0,
      checkIn: null,
      checkOut: null
    };
  } else {
    arrival = calculateArrival(record, shift);
  }

  return {
    employee: {
      id: employee.id,
      name: employee.name,
      email: employee.email
    },
    shift: shift
      ? {
          id: shift.id,
          name: shift.name,
          startTime: shift.startTime,
          endTime: shift.endTime
        }
      : null,
    date,
    status: arrival.status,
    lateMinutes: arrival.lateMinutes,
    checkIn: arrival.checkIn,
    checkOut: arrival.checkOut
  };
}

// GET /api/attendance/late-arrival/me/daily?date=YYYY-MM-DD
export const getMyDailyLateStatus = asyncHandler(async (req, res) => {
  const date = req.query.date || getLocalDate();

  if (!isValidDate(date)) {
    return res.status(400).json({
      success: false,
      message: "Date must use YYYY-MM-DD format."
    });
  }

  const employeeInfo = await getEmployeeInfo(req.user.id);

  if (!employeeInfo) {
    return res.status(200).json({
      success: true,
      data: {
        date,
        status: "no-active-shift",
        lateMinutes: 0
      }
    });
  }

  const attendance = await prisma.attendance.findUnique({
    where: { employee_date: { employee: req.user.id, date } },
  });
  const result = getDailyEmployeeStatus(employeeInfo, date, attendance);

  return res.status(200).json({
    success: true,
    data: result
  });
});

// GET /api/attendance/late-arrival/me/monthly?month=YYYY-MM
export const getMyMonthlyLateSummary = asyncHandler(async (req, res) => {
  const month = req.query.month || getLocalDate().slice(0, 7);

  if (!MONTH_REGEX.test(month)) {
    return res.status(400).json({
      success: false,
      message: "Month must use YYYY-MM format."
    });
  }

  const employeeInfo = await getEmployeeInfo(req.user.id);

  if (!employeeInfo || employeeInfo.hasShiftConflict || !employeeInfo.shift) {
    return res.status(200).json({
      success: true,
      data: {
        month,
        workingDays: 0,
        onTimeDays: 0,
        lateDays: 0,
        absentDays: 0,
        totalLateMinutes: 0,
        records: []
      }
    });
  }

  const dates = getWeekdaysInMonth(month);

  const records = await prisma.attendance.findMany({
    where: {
      employee: req.user.id,
      date: {
        gte: `${month}-01`,
        lte: `${month}-31`
      }
    }
  });

  const recordMap = new Map(
    records.map(record => [record.date, record])
  );

  const daily = dates.map(date => {
    const record = recordMap.get(date) || null;
    const arrival = calculateArrival(record, employeeInfo.shift);

    return {
      date,
      status: arrival.status,
      lateMinutes: arrival.lateMinutes,
      checkIn: arrival.checkIn
    };
  });

  return res.status(200).json({
    success: true,
    data: {
      month,
      workingDays: dates.length,
      onTimeDays: daily.filter(day => day.status === "on-time").length,
      lateDays: daily.filter(day => day.status === "late").length,
      absentDays: daily.filter(day => day.status === "absent").length,
      totalLateMinutes: daily.reduce(
        (sum, day) => sum + day.lateMinutes,
        0
      ),
      records: daily
    }
  });
});

// GET /api/attendance/late-arrival/reports/daily?date=YYYY-MM-DD
export const getDailyLateArrivalReport = asyncHandler(async (req, res) => {
  const date = req.query.date || getLocalDate();

  if (!isValidDate(date)) {
    return res.status(400).json({
      success: false,
      message: "Date must use YYYY-MM-DD format."
    });
  }

  const employees = await getAssignedEmployees();
  const employeeIds = employees.map(({ employee }) => employee.id);
  const attendance = employeeIds.length
    ? await prisma.attendance.findMany({
        where: { employee: { in: employeeIds }, date },
      })
    : [];
  const attendanceByEmployee = new Map(
    attendance.map((record) => [record.employee, record]),
  );
  const records = employees.map((employeeInfo) =>
    getDailyEmployeeStatus(
      employeeInfo,
      date,
      attendanceByEmployee.get(employeeInfo.employee.id) || null,
    ),
  );

  const summary = {
    date,
    isWorkingDay: isWeekday(date),
    totalEmployees: records.length,
    onTime: records.filter(item => item.status === "on-time").length,
    late: records.filter(item => item.status === "late").length,
    absent: records.filter(item => item.status === "absent").length,
    shiftConflicts: records.filter(
      item => item.status === "shift-conflict"
    ).length
  };

  return res.status(200).json({
    success: true,
    data: { summary, records }
  });
});

export const getLateArrivalReportRange = asyncHandler(async (req, res) => {
  const { from, to } = req.query;

  if (!isValidDate(from) || !isValidDate(to)) {
    return res.status(400).json({
      success: false,
      message: "Both from and to are required in YYYY-MM-DD format."
    });
  }

  if (from > to) {
    return res.status(400).json({
      success: false,
      message: "'from' cannot be later than 'to'."
    });
  }

  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  const dayCount = Math.floor((end - start) / 86400000) + 1;

  if (dayCount > 366) {
    return res.status(400).json({
      success: false,
      message: "Date range cannot exceed one year."
    });
  }

  const employees = await getAssignedEmployees();
  const daily = [];
  const totals = {
    onTime: 0,
    late: 0,
    absent: 0,
    shiftConflicts: 0,
    noActiveShift: 0
  };

  let latestRecords = [];
  for (let chunkOffset = 0; chunkOffset < dayCount; chunkOffset += 31) {
    const chunkEnd = Math.min(chunkOffset + 30, dayCount - 1);
    const chunkFrom = getLocalDate(new Date(start.getTime() + chunkOffset * 86400000));
    const chunkTo = getLocalDate(new Date(start.getTime() + chunkEnd * 86400000));
    const employeeIds = employees.map(({ employee }) => employee.id);
    const chunkAttendance = employeeIds.length
      ? await prisma.attendance.findMany({
          where: {
            employee: { in: employeeIds },
            date: { gte: chunkFrom, lte: chunkTo },
          },
        })
      : [];
    const attendanceByEmployeeDate = new Map(
      chunkAttendance.map((record) => [`${record.employee}:${record.date}`, record]),
    );

    for (let offset = chunkOffset; offset <= chunkEnd; offset++) {
      const date = getLocalDate(new Date(start.getTime() + offset * 86400000));
      const summary = {
        date,
        isWorkingDay: isWeekday(date),
        onTime: 0,
        late: 0,
        absent: 0,
        shiftConflicts: 0,
        noActiveShift: 0,
      };
      const currentDayRecords = offset === dayCount - 1 ? [] : null;

      for (const employeeInfo of employees) {
        const { employee, shift, hasShiftConflict } = employeeInfo;
        const record = attendanceByEmployeeDate.get(`${employee.id}:${date}`) || null;
        let arrival;

        if (hasShiftConflict) {
          arrival = {
            status: "shift-conflict",
            lateMinutes: 0,
            checkIn: record?.checkIn || null,
            checkOut: record?.checkOut || null
          };
        } else if (!record && !isWeekday(date)) {
          arrival = {
            status: "weekend",
            lateMinutes: 0,
            checkIn: null,
            checkOut: null
          };
        } else if (!shift) {
          arrival = {
            status: "no-active-shift",
            lateMinutes: 0,
            checkIn: record?.checkIn || null,
            checkOut: record?.checkOut || null
          };
        } else {
          arrival = calculateArrival(record, shift);
        }

        const summaryKey = arrival.status === "on-time" ? "onTime" : arrival.status;
        if (Object.hasOwn(summary, summaryKey)) summary[summaryKey] += 1;

        if (currentDayRecords) {
          currentDayRecords.push({
            employee: {
              id: employee.id,
              employeeId: employee.employeeId,
              name: employee.name,
              email: employee.email
            },
            shift: shift
              ? {
                  id: shift.id,
                  name: shift.name,
                  startTime: shift.startTime,
                  endTime: shift.endTime
                }
              : null,
            date,
            status: arrival.status,
            lateMinutes: arrival.lateMinutes,
            checkIn: arrival.checkIn,
            checkOut: arrival.checkOut
          });
        }
      }

      for (const key of Object.keys(totals)) totals[key] += summary[key];
      daily.push(summary);
      if (currentDayRecords) latestRecords = currentDayRecords;
    }
  }

  const workingDays = daily.filter(item => item.isWorkingDay).length;

  return res.status(200).json({
    success: true,
    data: {
      from,
      to,
      employeeCount: employees.length,
      workingDays,
      summary: totals,
      daily: daily.map(({ records: _records, ...item }) => item),
      records: latestRecords
    }
  });
});

// GET /api/attendance/late-arrival/reports/monthly?month=YYYY-MM
export const getMonthlyLateArrivalReport = asyncHandler(async (req, res) => {
  const month = req.query.month || getLocalDate().slice(0, 7);

  if (!MONTH_REGEX.test(month)) {
    return res.status(400).json({
      success: false,
      message: "Month must use YYYY-MM format."
    });
  }

  const employees = await getAssignedEmployees();
  const dates = getWeekdaysInMonth(month);

  const monthlyRecords = await prisma.attendance.findMany({
    where: {
      date: {
        gte: `${month}-01`,
        lte: `${month}-31`
      }
    }
  });

  const recordMap = new Map(
    monthlyRecords.map(record => [
      `${record.employee}:${record.date}`,
      record
    ])
  );

  const records = employees.map(
    ({ employee, shift, hasShiftConflict }) => {
      let onTimeDays = 0;
      let lateDays = 0;
      let absentDays = 0;
      let totalLateMinutes = 0;

      for (const date of dates) {
        if (hasShiftConflict || !shift) continue;

        const record =
      recordMap.get(`${employee.id}:${date}`) || null;

        const arrival = record
          ? calculateArrival(record, shift)
          : { status: "absent", lateMinutes: 0 };

        if (arrival.status === "on-time") onTimeDays++;
        if (arrival.status === "late") lateDays++;
        if (arrival.status === "absent") absentDays++;

        totalLateMinutes += arrival.lateMinutes;
      }

      return {
        employee: {
          id: employee.id,
          name: employee.name,
          email: employee.email
        },
        shift: shift
          ? {
              id: shift.id,
              name: shift.name,
              startTime: shift.startTime,
              endTime: shift.endTime
            }
          : null,
        shiftConflict: hasShiftConflict,
        month,
        workingDays: dates.length,
        onTimeDays,
        lateDays,
        absentDays,
        totalLateMinutes
      };
    }
  );

  const summary = records.reduce(
    (totals, item) => {
      totals.onTimeDays += item.onTimeDays;
      totals.lateDays += item.lateDays;
      totals.absentDays += item.absentDays;
      totals.totalLateMinutes += item.totalLateMinutes;
      return totals;
    },
    {
      month,
      employeeCount: records.length,
      workingDaysPerEmployee: dates.length,
      onTimeDays: 0,
      lateDays: 0,
      absentDays: 0,
      totalLateMinutes: 0
    }
  );

  return res.status(200).json({
    success: true,
    data: { summary, records }
  });
});
