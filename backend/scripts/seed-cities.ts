// Usage: npm run seed:cities
// Adds major Indian cities. Safe to run again: existing cities (same slug) are left unchanged.
import { connectDb, disconnectDb } from "../src/db.js";
import { ensureCities } from "../src/seed/cities.js";

await connectDb();
const { added, existing } = await ensureCities();
console.log(`Cities: ${added} added, ${existing} already existed.`);
await disconnectDb();
