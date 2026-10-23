CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(140) NOT NULL,
    "email" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");
CREATE UNIQUE INDEX "Company_email_key" ON "Company"("email");
ALTER TABLE "User" ADD COLUMN "companyId" TEXT;
ALTER TABLE "User" ADD COLUMN "isCompanyOwner" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "User_companyId_role_idx" ON "User"("companyId", "role");
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Shift" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Shift_companyId_isActive_idx" ON "Shift"("companyId", "isActive");
ALTER TABLE "Attendance" ADD COLUMN "companyId" TEXT;
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Attendance_companyId_date_idx" ON "Attendance"("companyId", "date");
DROP POLICY "Attendance_employee_or_admin_access" ON "Attendance";
CREATE POLICY "Attendance_employee_or_admin_access" ON "Attendance"
  USING (
    "employee" = current_setting('app.user_id', true)
    OR (current_setting('app.user_role', true) IN ('admin', 'hr') AND "companyId" = NULLIF(current_setting('app.company_id', true), ''))
  )
  WITH CHECK (
    "employee" = current_setting('app.user_id', true)
    AND "companyId" IS NOT DISTINCT FROM NULLIF(current_setting('app.company_id', true), '')
  );
