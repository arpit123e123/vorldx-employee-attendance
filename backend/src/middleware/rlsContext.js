import prisma, { requestDatabaseContext } from "../config/prisma.js";

const rollbackResponse = Symbol("rollbackResponse");

export function rlsContext(req, res, next) {
  if (!req.user?.id || !req.user?.role) {
    return res.status(401).json({ success: false, message: "Authentication required." });
  }

  const originalEnd = res.end;
  let endRequested = false;
  let resolveResponse;
  let rejectResponse;
  const responseReady = new Promise((resolve, reject) => {
    resolveResponse = resolve;
    rejectResponse = reject;
  });

  const onClose = () => {
    if (!endRequested) rejectResponse(new Error("Client disconnected before response completed."));
  };
  res.once("close", onClose);

  let transactionPromise;
  res.end = function rlsAwareEnd(...args) {
    if (endRequested) return this;
    endRequested = true;
    resolveResponse(res.statusCode >= 200 && res.statusCode < 400);

    transactionPromise
      .then(() => {
        res.removeListener("close", onClose);
        originalEnd.apply(res, args);
      })
      .catch((error) => {
        res.removeListener("close", onClose);
        if (error === rollbackResponse) {
          originalEnd.apply(res, args);
          return;
        }

        if (res.headersSent || res.destroyed) return;
        res.statusCode = 500;
        res.removeHeader("Content-Length");
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        originalEnd.call(res, JSON.stringify({
          success: false,
          message: "Internal server error",
        }));
      });

    return this;
  };

  transactionPromise = prisma.$transaction(
    async (transactionClient) => {
      await transactionClient.$queryRaw`
        SELECT
          set_config('app.user_id', ${req.user.id}, true),
          set_config('app.user_role', ${req.user.role}, true),
          set_config('app.company_id', ${req.user.companyId || ''}, true)
      `;

      return requestDatabaseContext.run(transactionClient, async () => {
        next();
        const shouldCommit = await responseReady;
        if (!shouldCommit) throw rollbackResponse;
      });
    },
    { maxWait: 10_000, timeout: 60_000 },
  );

  transactionPromise.catch((error) => {
    if (!endRequested && !res.headersSent && !res.destroyed) next(error);
  });
}
