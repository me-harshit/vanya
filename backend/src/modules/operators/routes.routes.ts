import { Router } from "express";
import { z } from "zod";
import { AppError } from "../../errors.js";
import { idParam, objectId, pageQuery } from "../../lib/ids.js";
import { BoardingPoint } from "../../models/BoardingPoint.js";
import { City } from "../../models/City.js";
import { Route } from "../../models/Route.js";

const stop = z.object({ point: objectId, offsetMinutes: z.number().int().min(0).max(4320) });

const createBody = z.object({
  fromCity: objectId,
  toCity: objectId,
  distanceKm: z.number().int().min(1).max(5000),
  durationMinutes: z.number().int().min(30).max(4320),
  boardingPoints: z.array(stop).min(1).max(15),
  droppingPoints: z.array(stop).min(1).max(15),
});

// Every point must exist, be active, belong to the right city, and be shared or the operator's own.
async function checkPoints(stops: { point: string; offsetMinutes: number }[], cityId: string, operatorId: string, label: string) {
  const ids = stops.map((s) => s.point);
  if (new Set(ids).size !== ids.length) {
    throw new AppError(400, "INVALID_ROUTE", `The same ${label} point is listed twice.`);
  }
  const found = await BoardingPoint.countDocuments({
    _id: { $in: ids },
    city: cityId,
    isActive: true,
    $or: [{ operator: null }, { operator: operatorId }],
  });
  if (found !== ids.length) {
    throw new AppError(400, "INVALID_POINTS", `Every ${label} point must be an active point in the right city.`);
  }
}

export function routeRoutes() {
  const r = Router();

  r.get("/", async (req, res) => {
    const q = pageQuery.parse(req.query);
    const items = await Route.find({ operator: req.operator!.id })
      .populate("fromCity", "name state")
      .populate("toCity", "name state")
      .sort({ createdAt: -1 })
      .skip(q.skip)
      .limit(q.limit);
    res.json({ items });
  });

  r.post("/", async (req, res) => {
    const body = createBody.parse(req.body);
    const op = req.operator!.id;

    if (body.fromCity === body.toCity) throw new AppError(400, "INVALID_ROUTE", "The two cities must be different.");
    if ((await City.countDocuments({ _id: { $in: [body.fromCity, body.toCity] }, isActive: true })) !== 2) {
      throw new AppError(400, "INVALID_CITY", "Both cities must exist and be active.");
    }
    if (body.boardingPoints.some((s) => s.offsetMinutes > body.durationMinutes) ||
        body.droppingPoints.some((s) => s.offsetMinutes > body.durationMinutes)) {
      throw new AppError(400, "INVALID_ROUTE", "A stop cannot be later than the total journey time.");
    }
    await checkPoints(body.boardingPoints, body.fromCity, op, "boarding");
    await checkPoints(body.droppingPoints, body.toCity, op, "dropping");

    const route = await Route.create({ operator: op, ...body });
    res.status(201).json({ route });
  });

  r.get("/:id", async (req, res) => {
    const route = await Route.findOne({ _id: idParam(req.params.id), operator: req.operator!.id })
      .populate("fromCity", "name state")
      .populate("toCity", "name state")
      .populate("boardingPoints.point", "name address landmark")
      .populate("droppingPoints.point", "name address landmark");
    if (!route) throw new AppError(404, "NOT_FOUND", "Route not found.");
    res.json({ route });
  });

  r.patch("/:id", async (req, res) => {
    const body = z.object({ isActive: z.boolean() }).parse(req.body);
    const route = await Route.findOneAndUpdate({ _id: idParam(req.params.id), operator: req.operator!.id }, body, {
      new: true,
    });
    if (!route) throw new AppError(404, "NOT_FOUND", "Route not found.");
    res.json({ route });
  });

  return r;
}
