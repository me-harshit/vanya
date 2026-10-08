import { Schema, model } from "mongoose";
import { applyJson } from "./shared.js";

// A stop on a route. `offsetMinutes` is the time after the bus departs the first stop.
const stopSchema = new Schema(
  {
    point: { type: Schema.Types.ObjectId, ref: "BoardingPoint", required: true },
    offsetMinutes: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const routeSchema = new Schema(
  {
    operator: { type: Schema.Types.ObjectId, ref: "Operator", required: true, index: true },
    fromCity: { type: Schema.Types.ObjectId, ref: "City", required: true },
    toCity: { type: Schema.Types.ObjectId, ref: "City", required: true },
    distanceKm: { type: Number, required: true, min: 1 },
    durationMinutes: { type: Number, required: true, min: 30 },
    boardingPoints: { type: [stopSchema], required: true },
    droppingPoints: { type: [stopSchema], required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);
applyJson(routeSchema);

export const Route = model("Route", routeSchema);
