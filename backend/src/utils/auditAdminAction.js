import prisma from "../config/prisma.js";

export async function auditAdminAction(req, {
  action,
  targetType,
  targetId = null,
  metadata = {},
  actorId: requestedActorId = null,
}) {
  const isPrivilegedUser = req.user && ["admin", "hr"].includes(req.user.role);
  const actorId = isPrivilegedUser ? req.user.id : requestedActorId;
  if (!actorId) return;

  await prisma.adminAuditLog.create({
    data: {
      actorId,
      action,
      targetType,
      targetId: targetId ? String(targetId).slice(0, 50) : null,
      metadata,
      ipAddress: req.ip?.slice(0, 64) || null,
      userAgent: req.get("user-agent")?.slice(0, 255) || null,
    },
  });
}
