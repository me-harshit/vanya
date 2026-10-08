// Checks that the database connection in .env works. Prints no secrets.
import mongoose from "mongoose";
import { connectDb, disconnectDb } from "../src/db.js";

try {
  const conn = await connectDb();
  await conn.db!.admin().ping();
  console.log(`OK: connected to database "${conn.name}" on host ${conn.host}`);
  const collections = await conn.db!.listCollections().toArray();
  console.log(`Collections: ${collections.length ? collections.map((c) => c.name).join(", ") : "(none yet)"}`);
  await disconnectDb();
} catch (err) {
  const e = err as Error & { code?: string | number };
  console.error(`FAILED: ${e.name}: ${e.message.replace(/mongodb(\+srv)?:\/\/\S+/g, "<uri hidden>")}`);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
}
