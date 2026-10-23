-- Keep employee self access, while limiting company admins and HR to their
-- own tenant. Legacy users without a company can only access unassigned users.
DROP POLICY "WfhRequest_employee_or_admin_access" ON "WfhRequest";
CREATE POLICY "WfhRequest_employee_or_company_admin_access" ON "WfhRequest"
  USING (
    "employeeId" = current_setting('app.user_id', true)
    OR (
      current_setting('app.user_role', true) IN ('admin', 'hr')
      AND EXISTS (
        SELECT 1 FROM "User" u
        WHERE u."id" = "WfhRequest"."employeeId"
          AND u."companyId" IS NOT DISTINCT FROM NULLIF(current_setting('app.company_id', true), '')
      )
    )
  )
  WITH CHECK (
    "employeeId" = current_setting('app.user_id', true)
    OR (
      current_setting('app.user_role', true) IN ('admin', 'hr')
      AND EXISTS (
        SELECT 1 FROM "User" u
        WHERE u."id" = "WfhRequest"."employeeId"
          AND u."companyId" IS NOT DISTINCT FROM NULLIF(current_setting('app.company_id', true), '')
      )
    )
  );

DROP POLICY "LeaveRequest_employee_or_admin_access" ON "LeaveRequest";
CREATE POLICY "LeaveRequest_employee_or_company_admin_access" ON "LeaveRequest"
  USING (
    "employeeId" = current_setting('app.user_id', true)
    OR (
      current_setting('app.user_role', true) IN ('admin', 'hr')
      AND EXISTS (
        SELECT 1 FROM "User" u
        WHERE u."id" = "LeaveRequest"."employeeId"
          AND u."companyId" IS NOT DISTINCT FROM NULLIF(current_setting('app.company_id', true), '')
      )
    )
  )
  WITH CHECK (
    "employeeId" = current_setting('app.user_id', true)
    OR (
      current_setting('app.user_role', true) IN ('admin', 'hr')
      AND EXISTS (
        SELECT 1 FROM "User" u
        WHERE u."id" = "LeaveRequest"."employeeId"
          AND u."companyId" IS NOT DISTINCT FROM NULLIF(current_setting('app.company_id', true), '')
      )
    )
  );
