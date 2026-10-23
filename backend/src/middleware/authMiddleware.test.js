import assert from "node:assert/strict";
import test from "node:test";
import { allowRoles, protect } from "./authMiddleware.js";

function response() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

test("protect rejects missing and malformed bearer headers before database access", async () => {
  for (const authorization of [undefined, "Basic token", "Bearer", "Bearer token extra"]) {
    const res = response();
    let nextError;
    await protect({ headers: { authorization } }, res, (error) => { nextError = error; });
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.success, false);
    assert.equal(nextError, undefined);
  }
});

test("protect rejects invalid JWTs with a generic 401 response", async () => {
  const res = response();
  let nextError;
  await protect(
    { headers: { authorization: "Bearer definitely-not-a-jwt" } },
    res,
    (error) => { nextError = error; }
  );
  assert.equal(res.statusCode, 401);
  assert.match(res.body.message, /Invalid or expired token/);
  assert.equal(nextError, undefined);
});

test("allowRoles requires authentication and denies roles outside the allowlist", () => {
  const middleware = allowRoles("admin", "hr");
  const unauthenticated = response();
  middleware({}, unauthenticated, () => assert.fail("must not authorize without a user"));
  assert.equal(unauthenticated.statusCode, 401);

  const employee = response();
  middleware({ user: { id: "employee-1", role: "employee" } }, employee, () => {
    assert.fail("must not authorize an employee");
  });
  assert.equal(employee.statusCode, 403);

  const admin = response();
  let continued = false;
  middleware({ user: { id: "admin-1", role: "admin" } }, admin, () => { continued = true; });
  assert.equal(continued, true);
});

test("allowRoles does not grant access to an unrelated company role", () => {
  const res = response();
  allowRoles("admin")({ user: { role: "hr", companyId: "company-b" } }, res, () => {
    assert.fail("must not authorize a disallowed role");
  });
  assert.equal(res.statusCode, 403);
});
