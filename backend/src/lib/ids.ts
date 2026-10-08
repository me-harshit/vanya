import { z } from "zod";
import { AppError } from "../errors.js";

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

// A malformed id in the URL is reported as "not found" so nothing is revealed.
export function idParam(value: unknown): string {
  const r = objectId.safeParse(value);
  if (!r.success) throw new AppError(404, "NOT_FOUND", "Not found.");
  return r.data;
}

export const pageQuery = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  skip: z.coerce.number().int().min(0).default(0),
});

export function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
