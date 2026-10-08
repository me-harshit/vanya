import { Router } from "express";
import { z } from "zod";
import { AppError } from "../../errors.js";
import { idParam, objectId, pageQuery } from "../../lib/ids.js";
import { BoardingPoint } from "../../models/BoardingPoint.js";
import { City } from "../../models/City.js";

const createBody = z.object({
  city: objectId,
  name: z.string().trim().min(2).max(80),
  address: z.string().trim().max(200).optional(),
  landmark: z.string().trim().max(100).optional(),
});

// Boarding and dropping points the operator can use: shared ones plus their own.
export function pointRoutes() {
  const r = Router();

  r.get("/", async (req, res) => {
    const q = pageQuery.extend({ city: objectId.optional() }).parse(req.query);
    const filter = {
      isActive: true,
      $or: [{ operator: null }, { operator: req.operator!.id }],
      ...(q.city ? { city: q.city } : {}),
    };
    const items = await BoardingPoint.find(filter).sort({ name: 1 }).skip(q.skip).limit(q.limit);
    res.json({ items });
  });

  r.post("/", async (req, res) => {
    const body = createBody.parse(req.body);
    if (!(await City.exists({ _id: body.city, isActive: true }))) {
      throw new AppError(400, "INVALID_CITY", "That city does not exist.");
    }
    const point = await BoardingPoint.create({ ...body, operator: req.operator!.id });
    res.status(201).json({ point });
  });

  r.patch("/:id", async (req, res) => {
    const body = createBody.omit({ city: true }).partial().extend({ isActive: z.boolean().optional() }).parse(req.body);
    const point = await BoardingPoint.findOneAndUpdate(
      { _id: idParam(req.params.id), operator: req.operator!.id }, // only the operator's own points
      body,
      { new: true },
    );
    if (!point) throw new AppError(404, "NOT_FOUND", "Point not found.");
    res.json({ point });
  });

  return r;
}
