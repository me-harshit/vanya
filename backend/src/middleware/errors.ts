import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { config } from "../config.js";
import { AppError } from "../errors.js";

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Not found." } });
}

// Every error leaves the API in the same shape: { error: { code, message, ... } }.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message, ...err.extra } });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Some fields are invalid.",
        fields: err.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
    });
    return;
  }
  if (err && typeof err === "object" && "type" in err && err.type === "entity.parse.failed") {
    res.status(400).json({ error: { code: "BAD_JSON", message: "Request body is not valid JSON." } });
    return;
  }

  console.error(err);
  res.status(500).json({
    error: {
      code: "INTERNAL",
      message: config.NODE_ENV === "production" ? "Something went wrong." : String((err as Error)?.message ?? err),
    },
  });
}
