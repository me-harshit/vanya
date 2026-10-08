import { Router } from "express";
import { z } from "zod";
import { AMENITIES } from "../../constants.js";
import { AppError } from "../../errors.js";
import { idParam, pageQuery } from "../../lib/ids.js";
import { Bus } from "../../models/Bus.js";
import { deriveBusType, layoutInputSchema, resolveLayout } from "./layout.js";

const registration = z
  .string()
  .trim()
  .transform((s) => s.replace(/[\s-]/g, "").toUpperCase())
  .pipe(z.string().regex(/^[A-Z0-9]{6,12}$/, "Enter the bus registration number, for example DL01AB1234"));

const createBody = z.object({
  name: z.string().trim().min(1).max(60),
  registrationNumber: registration,
  ac: z.boolean(),
  amenities: z.array(z.enum(AMENITIES)).max(10).default([]),
  layout: layoutInputSchema,
});

const updateBody = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  ac: z.boolean().optional(),
  amenities: z.array(z.enum(AMENITIES)).max(10).optional(),
  isActive: z.boolean().optional(),
  // Changing the layout only affects trips created afterwards.
  layout: layoutInputSchema.optional(),
});

export function busRoutes() {
  const r = Router();

  r.get("/", async (req, res) => {
    const q = pageQuery.parse(req.query);
    const items = await Bus.find({ operator: req.operator!.id }).sort({ createdAt: -1 }).skip(q.skip).limit(q.limit);
    res.json({ items });
  });

  r.post("/", async (req, res) => {
    const body = createBody.parse(req.body);
    const seats = resolveLayout(body.layout);
    try {
      const bus = await Bus.create({
        operator: req.operator!.id,
        name: body.name,
        registrationNumber: body.registrationNumber,
        ac: body.ac,
        amenities: body.amenities,
        seats,
        type: deriveBusType(seats),
        seatCount: seats.length,
      });
      res.status(201).json({ bus });
    } catch (err) {
      if ((err as { code?: number }).code === 11000) {
        throw new AppError(409, "BUS_EXISTS", "A bus with this registration number already exists.");
      }
      throw err;
    }
  });

  r.get("/:id", async (req, res) => {
    const bus = await Bus.findOne({ _id: idParam(req.params.id), operator: req.operator!.id });
    if (!bus) throw new AppError(404, "NOT_FOUND", "Bus not found.");
    res.json({ bus });
  });

  r.patch("/:id", async (req, res) => {
    const { layout, ...rest } = updateBody.parse(req.body);
    const update: Record<string, unknown> = { ...rest };
    if (layout) {
      const seats = resolveLayout(layout);
      Object.assign(update, { seats, type: deriveBusType(seats), seatCount: seats.length });
    }
    const bus = await Bus.findOneAndUpdate({ _id: idParam(req.params.id), operator: req.operator!.id }, update, {
      new: true,
    });
    if (!bus) throw new AppError(404, "NOT_FOUND", "Bus not found.");
    res.json({ bus });
  });

  return r;
}
