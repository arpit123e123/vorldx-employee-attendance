import prisma from "../config/prisma.js";
import asyncHandler from "../utils/asyncHandler.js";
import { auditAdminAction } from "../utils/auditAdminAction.js";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const REQUEST_STATUSES = new Set(["pending", "approved", "rejected"]);

function isValidDate(value) {
  if (!DATE_REGEX.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function getLocalDate(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

const requestIncludes = {
  employee: {
    select: { id: true, employeeId: true, name: true, email: true },
  },
  reviewer: {
    select: { id: true, name: true, email: true },
  },
};

export const createMyWfhRequest = asyncHandler(async (req, res) => {
  const date = typeof req.body?.date === "string" ? req.body.date.trim() : "";
  const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";

  if (!isValidDate(date)) {
    return res.status(400).json({
      success: false,
      message: "WFH date must be a valid date in YYYY-MM-DD format.",
    });
  }

  if (date < getLocalDate()) {
    return res.status(400).json({
      success: false,
      message: "WFH request date cannot be in the past.",
    });
  }

  if (reason.length < 5 || reason.length > 1000) {
    return res.status(400).json({
      success: false,
      message: "Reason must be between 5 and 1000 characters.",
    });
  }

  const existing = await prisma.wfhRequest.findFirst({
    where: {
      employeeId: req.user.id,
      date,
      status: { in: ["pending", "approved"] },
    },
    select: { id: true, status: true },
  });

  if (existing) {
    return res.status(409).json({
      success: false,
      message: `A ${existing.status} WFH request already exists for this date.`,
    });
  }

  const request = await prisma.wfhRequest.create({
    data: { employeeId: req.user.id, date, reason },
    include: requestIncludes,
  });

  return res.status(201).json({
    success: true,
    message: "WFH request submitted to HR successfully.",
    data: { request },
  });
});

export const getMyWfhRequests = asyncHandler(async (req, res) => {
  const requests = await prisma.wfhRequest.findMany({
    where: { employeeId: req.user.id },
    include: requestIncludes,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  return res.status(200).json({
    success: true,
    count: requests.length,
    data: { requests },
  });
});

export const getWfhRequests = asyncHandler(async (req, res) => {
  const requestedStatus = String(req.query.status || "").toLowerCase();

  if (requestedStatus && requestedStatus !== "all" && !REQUEST_STATUSES.has(requestedStatus)) {
    return res.status(400).json({
      success: false,
      message: "Status must be pending, approved, rejected or all.",
    });
  }

  const requests = await prisma.wfhRequest.findMany({
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

export const reviewWfhRequest = asyncHandler(async (req, res) => {
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

  const existing = await prisma.wfhRequest.findFirst({
    where: { id: req.params.id, employee: { companyId: req.user.companyId || null } },
  });

  if (!existing) {
    return res.status(404).json({
      success: false,
      message: "WFH request not found.",
    });
  }

  if (existing.status !== "pending") {
    return res.status(409).json({
      success: false,
      message: "This WFH request has already been reviewed.",
    });
  }

  const updated = await prisma.wfhRequest.updateMany({
    where: {
      id: existing.id,
      status: "pending",
      employee: { companyId: req.user.companyId || null },
    },
    data: {
      status,
      reviewNote: reviewNote || null,
      reviewedBy: req.user.id,
      reviewedAt: new Date(),
    },
  });

  if (updated.count === 0) {
    return res.status(409).json({
      success: false,
      message: "This WFH request was already reviewed by another admin/HR user.",
    });
  }

  const request = await prisma.wfhRequest.findFirst({
    where: { id: existing.id, employee: { companyId: req.user.companyId || null } },
    include: requestIncludes,
  });

  await auditAdminAction(req, {
    action: `wfh_request.${status}`,
    targetType: "wfh_request",
    targetId: request.id,
  });

  return res.status(200).json({
    success: true,
    message: `WFH request ${status}.`,
    data: { request },
  });
});
