CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" VARCHAR(80) NOT NULL,
    "targetType" VARCHAR(50) NOT NULL,
    "targetId" VARCHAR(50),
    "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "ipAddress" VARCHAR(64),
    "userAgent" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AdminAuditLog_actorId_fkey"
      FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "AdminAuditLog_actorId_createdAt_idx"
  ON "AdminAuditLog"("actorId", "createdAt");
CREATE INDEX "AdminAuditLog_targetType_targetId_createdAt_idx"
  ON "AdminAuditLog"("targetType", "targetId", "createdAt");
CREATE INDEX "Attendance_date_checkIn_idx"
  ON "Attendance"("date", "checkIn");

ALTER TABLE "Attendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Attendance" FORCE ROW LEVEL SECURITY;
CREATE POLICY "Attendance_employee_or_admin_access" ON "Attendance"
  USING (
    current_setting('app.user_role', true) IN ('admin', 'hr')
    OR "employee" = current_setting('app.user_id', true)
  )
  WITH CHECK (
    current_setting('app.user_role', true) IN ('admin', 'hr')
    OR "employee" = current_setting('app.user_id', true)
  );

ALTER TABLE "WfhRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WfhRequest" FORCE ROW LEVEL SECURITY;
CREATE POLICY "WfhRequest_employee_or_admin_access" ON "WfhRequest"
  USING (
    current_setting('app.user_role', true) IN ('admin', 'hr')
    OR "employeeId" = current_setting('app.user_id', true)
  )
  WITH CHECK (
    current_setting('app.user_role', true) IN ('admin', 'hr')
    OR "employeeId" = current_setting('app.user_id', true)
  );

ALTER TABLE "LeaveRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LeaveRequest" FORCE ROW LEVEL SECURITY;
CREATE POLICY "LeaveRequest_employee_or_admin_access" ON "LeaveRequest"
  USING (
    current_setting('app.user_role', true) IN ('admin', 'hr')
    OR "employeeId" = current_setting('app.user_id', true)
  )
  WITH CHECK (
    current_setting('app.user_role', true) IN ('admin', 'hr')
    OR "employeeId" = current_setting('app.user_id', true)
  );
