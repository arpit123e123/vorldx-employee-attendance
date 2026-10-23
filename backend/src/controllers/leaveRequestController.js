import prisma from "../config/prisma.js";
import asyncHandler from "../utils/asyncHandler.js";
import { auditAdminAction } from "../utils/auditAdminAction.js";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const REQUEST_STATUSES = new Set(["pending", "approved", "rejected"]);
const LEAVE_TYPES = new Set(["annual", "sick", "casual", "unpaid", "other"]);

function isValidDate(value) {
  if (!DATE_REGEX.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

const requestIncludes = {
  employee: { select: { id: true, employeeId: true, name: true, email: true } },
  reviewer: { select: { id: true, name: true, email: true } },
};

export const createMyLeaveRequest = asyncHandler(async (req, res) => {
  const leaveType = typeof req.body?.leaveType === "string" ? req.body.leaveType.trim().toLowerCase() : "";
  const startDate = typeof req.body?.startDate === "string" ? req.body.startDate.trim() : "";
  const endDate = typeof req.body?.endDate === "string" ? req.body.endDate.trim() : "";
  const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";

  if (!LEAVE_TYPES.has(leaveType)) {
    return res.status(400).json({
      success: false,
      message: "Choose a valid leave type.",
    });
  }

  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    return res.status(400).json({
      success: false,
      message: "Leave dates must be valid and use YYYY-MM-DD format.",
    });
  }

  if (endDate < startDate) {
    return res.status(400).json({
      success: false,
      message: "Leave end date cannot be before its start date.",
    });
  }

  if (reason.length < 5 || reason.length > 1000) {
    return res.status(400).json({
      success: false,
      message: "Reason must be between 5 and 1000 characters.",
    });
  }

  const overlappingRequest = await prisma.leaveRequest.findFirst({
    where: {
      employeeId: req.user.id,
      status: { in: ["pending", "approved"] },
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    },
    select: { id: true, status: true },
  });

  if (overlappingRequest) {
    return res.status(409).json({
      success: false,
      message: `A ${overlappingRequest.status} leave request already overlaps these dates.`,
    });
  }

  const request = await prisma.leaveRequest.create({
    data: { employeeId: req.user.id, leaveType, startDate, endDate, reason },
    include: requestIncludes,
  });

  return res.status(201).json({
    success: true,
    message: "Leave request submitted to HR successfully.",
    data: { request },
  });
});

export const getMyLeaveRequests = asyncHandler(async (req, res) => {
  const requests = await prisma.leaveRequest.findMany({
    where: { employeeId: req.user.id },
    include: requestIncludes,
    orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
  });

  return res.status(200).json({
    success: true,
    count: requests.length,
    data: { requests },
  });
});

export const getLeaveRequests = asyncHandler(async (req, res) => {
  const requestedStatus = String(req.query.status || "").toLowerCase();

  if (requestedStatus && requestedStatus !== "all" && !REQUEST_STATUSES.has(requestedStatus)) {
    return res.status(400).json({
      success: false,
      message: "Status must be pending, approved, rejected or all.",
    });
  }

  const requests = await prisma.leaveRequest.findMany({
    where: {
      ...(requestedStatus && requestedStatus !== "all" ? { status: requestedStatus } : {}),
      employee: { companyId: req.user.companyId || null },
    },
    include: requestIncludes,
    orderBy: [{ createdAt: "desc" }],
  });

  return res.status(200).json({
    success: true,
    count: requests.length,
    data: { requests },
  });
});

export const reviewLeaveRequest = asyncHandler(async (req, res) => {
  const status = typeof req.body?.status === "string" ? req.body.status.toLowerCase() : "";
  const reviewNote = typeof req.body?.reviewNote === "string" ? req.body.reviewNote.trim() : "";

  if (!["approved", "rejected"].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Status must be approved or rejected.",
    });
  }

  if (reviewNote.length > 500) {
    return res.status(400).json({
      success: false,
      message: "HR note cannot exceed 500 characters.",
    });
  }

  const existing = await prisma.leaveRequest.findFirst({
    where: { id: req.params.id, employee: { companyId: req.user.companyId || null } },
  });
  if (!existing) {
    return res.status(404).json({ success: false, message: "Leave request not found." });
  }
  if (existing.status !== "pending") {
    return res.status(409).json({ success: false, message: "This leave request has already been reviewed." });
  }

  const updated = await prisma.leaveRequest.updateMany({
    where: {
      id: existing.id,
      status: "pending",
      employee: { companyId: req.user.companyId || null },
    },
    data: { status, reviewNote: reviewNote || null, reviewedBy: req.user.id, reviewedAt: new Date() },
  });

  if (updated.count === 0) {
    return res.status(409).json({
      success: false,
      message: "This leave request was already reviewed by another admin/HR user.",
    });
  }

  const request = await prisma.leaveRequest.findFirst({
    where: { id: existing.id, employee: { companyId: req.user.companyId || null } },
    include: requestIncludes,
  });

  await auditAdminAction(req, {
    action: `leave_request.${status}`,
    targetType: "leave_request",
    targetId: request.id,
  });

  return res.status(200).json({
    success: true,
    message: `Leave request ${status}.`,
    data: { request },
  });
});
