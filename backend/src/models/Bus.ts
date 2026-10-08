import { Schema, model } from "mongoose";
import { AMENITIES, BUS_TYPES, DECKS, SEAT_KINDS } from "../constants.js";
import { applyJson } from "./shared.js";

// The physical seat layout. Trips copy this when they are created, so editing a bus later
// never changes trips that already exist.
export const layoutSeatSchema = new Schema(
  {
    no: { type: String, required: true },
    deck: { type: String, enum: DECKS, required: true },
    row: { type: Number, required: true },
    col: { type: Number, required: true },
    kind: { type: String, enum: SEAT_KINDS, required: true },
    ladies: { type: Boolean, default: false },
  },
  { _id: false },
);

const busSchema = new Schema(
  {
    operator: { type: Schema.Types.ObjectId, ref: "Operator", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    registrationNumber: { type: String, required: true, unique: true, uppercase: true },
    ac: { type: Boolean, required: true },
    amenities: [{ type: String, enum: AMENITIES }],
    seats: { type: [layoutSeatSchema], required: true },
    type: { type: String, enum: BUS_TYPES, required: true },
    seatCount: { type: Number, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);
applyJson(busSchema);

export const Bus = model("Bus", busSchema);
