import assert from "node:assert/strict";
import test from "node:test";
import errorHandler from "./errorHandler.js";

function response() {
  return {
    statusCode: 200,
    body: undefined,
    headersSent: false,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

test("maps malformed JSON to a client error", () => {
  const res = response();
  const originalError = console.error;
  console.error = () => {};
  try {
    errorHandler({ type: "entity.parse.failed", message: "parser detail" }, { route: {} }, res, () => {});
  } finally {
    console.error = originalError;
  }
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.message, "Invalid JSON request body.");
});

test("hides internal exception details for server errors", () => {
  const res = response();
  const originalError = console.error;
  console.error = () => {};
  try {
    errorHandler(new Error("private connection detail"), { route: {} }, res, () => {});
  } finally {
    console.error = originalError;
  }
  assert.equal(res.statusCode, 500);
  assert.equal(res.body.message, "Internal server error");
});

test("maps uniqueness conflicts without exposing database details", () => {
  const res = response();
  const originalError = console.error;
  console.error = () => {};
  try {
    errorHandler({ code: "P2002", message: "secret SQL detail" }, { route: {} }, res, () => {});
  } finally {
    console.error = originalError;
  }
  assert.equal(res.statusCode, 409);
  assert.equal(res.body.message, "A record with this value already exists");
});
