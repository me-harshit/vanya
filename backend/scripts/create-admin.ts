// Usage: npm run admin:create -- 9876543210 "Full Name"
// Creates the user if needed and sets their role to admin. They then sign in with OTP as usual.
import { PHONE_REGEX } from "../src/constants.js";
import { connectDb, disconnectDb } from "../src/db.js";
import { User } from "../src/models/User.js";

const [phone, ...nameParts] = process.argv.slice(2);
if (!phone || !PHONE_REGEX.test(phone)) {
  console.error('Usage: npm run admin:create -- <10-digit mobile> ["Full Name"]');
  process.exit(1);
}

await connectDb();
const name = nameParts.join(" ").trim();
const user = await User.findOneAndUpdate(
  { phone },
  { $set: { role: "admin", ...(name ? { name } : {}) } },
  { upsert: true, new: true },
);
console.log(`Admin ready: ${user.phone}${user.name ? ` (${user.name})` : ""}`);
await disconnectDb();
