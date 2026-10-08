import { Router } from "express";
import { z } from "zod";
import { OPERATOR_STATUSES } from "../../constants.js";
import { AppError } from "../../errors.js";
import { escapeRegex, idParam, objectId, pageQuery, slugify } from "../../lib/ids.js";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { BoardingPoint } from "../../models/BoardingPoint.js";
import { City } from "../../models/City.js";
import { Operator } from "../../models/Operator.js";
import type { BookingService } from "../bookings/bookings.service.js";
import { adminBookingRoutes } from "./admin.bookings.routes.js";

const cityBody = z.object({
  name: z.string().trim().min(2).max(60),
  state: z.string().trim().min(2).max(60),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/).optional(),
});

const pointBody = z.object({
  city: objectId,
  name: z.string().trim().min(2).max(80),
  address: z.string().trim().max(200).optional(),
  landmark: z.string().trim().max(100).optional(),
});

export function adminRoutes(bookings: BookingService) {
  const r = Router();
  r.use(requireAuth, requireRole("admin"));
  r.use(adminBookingRoutes(bookings));

  r.get("/ping", (_req, res) => {
    res.json({ ok: true });
  });

  // ---- Cities
  r.get("/cities", async (req, res) => {
    const q = pageQuery.extend({ q: z.string().trim().max(50).optional() }).parse(req.query);
    const filter = q.q ? { name: new RegExp(escapeRegex(q.q), "i") } : {};
    const [items, total] = await Promise.all([
      City.find(filter).sort({ name: 1 }).skip(q.skip).limit(q.limit),
      City.countDocuments(filter),
    ]);
    res.json({ items, total });
  });

  r.post("/cities", async (req, res) => {
    const body = cityBody.parse(req.body);
    try {
      const city = await City.create({ ...body, slug: body.slug ?? slugify(body.name) });
      res.status(201).json({ city });
    } catch (err) {
      if ((err as { code?: number }).code === 11000) throw new AppError(409, "CITY_EXISTS", "A city with this slug already exists.");
      throw err;
    }
  });

  r.patch("/cities/:id", async (req, res) => {
    const body = cityBody.omit({ slug: true }).partial().extend({ isActive: z.boolean().optional() }).parse(req.body);
    const city = await City.findByIdAndUpdate(idParam(req.params.id), body, { new: true });
    if (!city) throw new AppError(404, "NOT_FOUND", "City not found.");
    res.json({ city });
  });

  // ---- Shared boarding and dropping points (available to every operator)
  r.get("/points", async (req, res) => {
    const q = pageQuery.extend({ city: objectId.optional() }).parse(req.query);
    const filter = { operator: null, ...(q.city ? { city: q.city } : {}) };
    const items = await BoardingPoint.find(filter).sort({ name: 1 }).skip(q.skip).limit(q.limit);
    res.json({ items });
  });

  r.post("/points", async (req, res) => {
    const body = pointBody.parse(req.body);
    if (!(await City.exists({ _id: body.city }))) throw new AppError(400, "INVALID_CITY", "That city does not exist.");
    const point = await BoardingPoint.create({ ...body, operator: null });
    res.status(201).json({ point });
  });

  r.patch("/points/:id", async (req, res) => {
    const body = pointBody.omit({ city: true }).partial().extend({ isActive: z.boolean().optional() }).parse(req.body);
    const point = await BoardingPoint.findOneAndUpdate({ _id: idParam(req.params.id), operator: null }, body, { new: true });
    if (!point) throw new AppError(404, "NOT_FOUND", "Point not found.");
    res.json({ point });
  });

  // ---- Operators
  r.get("/operators", async (req, res) => {
    const q = pageQuery.extend({ status: z.enum(OPERATOR_STATUSES).optional() }).parse(req.query);
    const filter = q.status ? { status: q.status } : {};
    const [items, total] = await Promise.all([
      Operator.find(filter).populate("user", "phone name").sort({ createdAt: -1 }).skip(q.skip).limit(q.limit),
      Operator.countDocuments(filter),
    ]);
    res.json({ items, total });
  });

  r.patch("/operators/:id", async (req, res) => {
    const body = z
      .object({ status: z.enum(OPERATOR_STATUSES).optional(), commissionPercent: z.number().min(0).max(50).optional() })
      .refine((b) => Object.keys(b).length > 0, "Nothing to update")
      .parse(req.body);
    const operator = await Operator.findByIdAndUpdate(idParam(req.params.id), body, { new: true });
    if (!operator) throw new AppError(404, "NOT_FOUND", "Operator not found.");
    res.json({ operator });
  });

  return r;
}
