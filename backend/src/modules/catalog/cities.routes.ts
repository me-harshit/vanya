import { Router } from "express";
import { z } from "zod";
import { escapeRegex, pageQuery } from "../../lib/ids.js";
import { City } from "../../models/City.js";

// Public: city autocomplete for the search box.
export function cityRoutes() {
  const r = Router();

  r.get("/", async (req, res) => {
    const q = pageQuery.extend({ q: z.string().trim().max(50).optional() }).parse(req.query);
    const filter = { isActive: true, ...(q.q ? { name: new RegExp(`^${escapeRegex(q.q)}`, "i") } : {}) };
    const items = await City.find(filter, { name: 1, state: 1, slug: 1 }).sort({ name: 1 }).skip(q.skip).limit(q.limit);
    res.json({ items });
  });

  return r;
}
