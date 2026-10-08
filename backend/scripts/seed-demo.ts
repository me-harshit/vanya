// Usage:
//   npm run seed:demo              add demo operators, buses, routes and 10 days of trips (safe to run again)
//   npm run seed:demo -- --reset   remove all demo data first, then add it fresh
//   npm run seed:demo -- --remove  remove all demo data and stop
//
// Demo accounts (sign in with the OTP printed in the server log):
//   operators: 9999900001, 9999900002, 9999900003     customer: 9999900010
import { config } from "../src/config.js";
import { connectDb, disconnectDb } from "../src/db.js";
import { DEMO_CUSTOMER_PHONE, resetDemo, seedDemo } from "../src/seed/demo.js";

if (config.NODE_ENV === "production") {
  console.error("Refusing to seed demo data in production.");
  process.exit(1);
}

const args = new Set(process.argv.slice(2));
const conn = await connectDb();
console.log(`Database: ${conn.name}`);

if (args.has("--remove")) {
  console.log("Removed demo data:", await resetDemo());
} else {
  const s = await seedDemo({ reset: args.has("--reset") });
  console.log("Demo data ready:", s);
  console.log("Operators: 9999900001, 9999900002, 9999900003   Customer:", DEMO_CUSTOMER_PHONE);
  console.log("Try: GET /trips/search?from=delhi&to=manali&date=<tomorrow>");
}
await disconnectDb();
