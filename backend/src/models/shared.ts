import type { Schema } from "mongoose";

// Every model returns `id` (a string) instead of `_id` / `__v` in API responses.
// (Applied with a function, not a shared options object, so Mongoose can still infer types.)
export function applyJson(schema: Schema) {
  schema.set("toJSON", {
    versionKey: false,
    transform: (_doc: unknown, ret: Record<string, unknown>) => {
      if (ret._id !== undefined) {
        ret.id = String(ret._id);
        delete ret._id;
      }
      return ret;
    },
  });
}

// Fares and prices are whole rupees. Convert to paise when charging (payments step).
