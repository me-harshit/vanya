import { Schema, model } from "mongoose";
import { AMENITIES, BUS_TYPES, DECKS, SEAT_KINDS, SEAT_STATUSES, TRIP_STATUSES } from "../constants.js";
import { applyJson } from "./shared.js";

// One departure of one bus on one route. Names and layout are copied in (snapshots) so later
// edits to the bus, route or city do not change trips that already exist.
const seatSchema = new Schema(
  {
    no: { type: String, required: true },
    deck: { type: String, enum: DECKS, required: true },
    row: { type: Number, required: true },
    col: { type: Number, required: true },
    kind: { type: String, enum: SEAT_KINDS, required: true },
    ladies: { type: Boolean, default: false },
    price: { type: Number, required: true, min: 1 },
    // The seat hold engine (next step) changes these with atomic updates.
    status: { type: String, enum: SEAT_STATUSES, default: "available", required: true },
    heldUntil: Date,
    heldBy: { type: Schema.Types.ObjectId, ref: "User" },
    bookingId: { type: Schema.Types.ObjectId },
  },
  { _id: false },
);

const stopSnapshot = new Schema(
  {
    point: { type: Schema.Types.ObjectId, ref: "BoardingPoint", required: true },
    name: { type: String, required: true },
    address: String,
    landmark: String,
    time: { type: Date, required: true },
  },
  { _id: false },
);

const policyRule = new Schema(
  {
    hoursBeforeDeparture: { type: Number, required: true, min: 0 },
    refundPercent: { type: Number, required: true, min: 0, max: 100 },
  },
  { _id: false },
);

const busInfoSchema = new Schema(
  {
    name: { type: String, required: true },
    type: { type: String, enum: BUS_TYPES, required: true },
    ac: { type: Boolean, required: true },
    amenities: [{ type: String, enum: AMENITIES }],
  },
  { _id: false },
);

const tripSchema = new Schema(
  {
    operator: { type: Schema.Types.ObjectId, ref: "Operator", required: true },
    operatorName: { type: String, required: true },
    bus: { type: Schema.Types.ObjectId, ref: "Bus", required: true },
    busInfo: { type: busInfoSchema, required: true },
    route: { type: Schema.Types.ObjectId, ref: "Route", required: true },
    fromCity: { type: Schema.Types.ObjectId, ref: "City", required: true },
    toCity: { type: Schema.Types.ObjectId, ref: "City", required: true },
    fromCityName: { type: String, required: true },
    toCityName: { type: String, required: true },
    distanceKm: { type: Number, required: true },
    durationMinutes: { type: Number, required: true },
    departureAt: { type: Date, required: true },
    arrivalAt: { type: Date, required: true },
    boardingPoints: { type: [stopSnapshot], required: true },
    droppingPoints: { type: [stopSnapshot], required: true },
    seats: { type: [seatSchema], required: true },
    cancellationPolicy: { type: [policyRule], required: true },
    status: { type: String, enum: TRIP_STATUSES, default: "scheduled", required: true },
  },
  { timestamps: true },
);
applyJson(tripSchema);

// Search: trips between two cities in a time window.
tripSchema.index({ fromCity: 1, toCity: 1, departureAt: 1, status: 1 });
tripSchema.index({ operator: 1, departureAt: -1 });
tripSchema.index({ bus: 1, departureAt: 1 });
tripSchema.index({ status: 1, departureAt: 1 }); // expired-hold sweep
tripSchema.index({ "seats.heldBy": 1 }); // "which trips does this customer hold seats on"

export const Trip = model("Trip", tripSchema);
