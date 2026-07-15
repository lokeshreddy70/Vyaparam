import { randomUUID } from "node:crypto";
import { NextFunction, Request, Response } from "express";

export function requestContextMiddleware(
  req: Request & { correlationId?: string; requestId?: string },
  res: Response,
  next: NextFunction,
) {
  const requestId = req.headers["x-request-id"]?.toString() ?? randomUUID();
  const correlationId = req.headers["x-correlation-id"]?.toString() ?? requestId;

  req.requestId = requestId;
  req.correlationId = correlationId;

  res.setHeader("x-request-id", requestId);
  res.setHeader("x-correlation-id", correlationId);

  next();
}
