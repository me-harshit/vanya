import { Schema, model, type InferSchemaType } from "mongoose";
import { ROLES } from "../constants.js";

const userSchema = new Schema(
  {
    phone: { type: String, required: true, unique: true },
    name: { type: String, trim: true },
    role: { type: String, enum: ROLES, default: "customer", required: true },
    lastLoginAt: Date,
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof userSchema> & { _id: import("mongoose").Types.ObjectId };
export const User = model("User", userSchema);
