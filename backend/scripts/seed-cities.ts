// Usage: npm run seed:cities
// Adds major Indian cities. Safe to run again: existing cities (same slug) are left unchanged.
import { slugify } from "../src/lib/ids.js";
import { connectDb, disconnectDb } from "../src/db.js";
import { City } from "../src/models/City.js";

const CITIES: [name: string, state: string][] = [
  ["Delhi", "Delhi"], ["Mumbai", "Maharashtra"], ["Pune", "Maharashtra"], ["Nagpur", "Maharashtra"], ["Nashik", "Maharashtra"],
  ["Bengaluru", "Karnataka"], ["Mysuru", "Karnataka"], ["Mangaluru", "Karnataka"], ["Hubballi", "Karnataka"],
  ["Chennai", "Tamil Nadu"], ["Coimbatore", "Tamil Nadu"], ["Madurai", "Tamil Nadu"],
  ["Hyderabad", "Telangana"], ["Vijayawada", "Andhra Pradesh"], ["Visakhapatnam", "Andhra Pradesh"], ["Tirupati", "Andhra Pradesh"],
  ["Kochi", "Kerala"], ["Thiruvananthapuram", "Kerala"], ["Kozhikode", "Kerala"],
  ["Ahmedabad", "Gujarat"], ["Surat", "Gujarat"], ["Vadodara", "Gujarat"], ["Rajkot", "Gujarat"],
  ["Jaipur", "Rajasthan"], ["Udaipur", "Rajasthan"], ["Jodhpur", "Rajasthan"], ["Ajmer", "Rajasthan"],
  ["Chandigarh", "Chandigarh"], ["Amritsar", "Punjab"], ["Ludhiana", "Punjab"],
  ["Manali", "Himachal Pradesh"], ["Shimla", "Himachal Pradesh"], ["Dehradun", "Uttarakhand"], ["Haridwar", "Uttarakhand"],
  ["Lucknow", "Uttar Pradesh"], ["Agra", "Uttar Pradesh"], ["Varanasi", "Uttar Pradesh"], ["Kanpur", "Uttar Pradesh"],
  ["Goa", "Goa"], ["Bhopal", "Madhya Pradesh"], ["Indore", "Madhya Pradesh"],
  ["Kolkata", "West Bengal"], ["Siliguri", "West Bengal"], ["Patna", "Bihar"], ["Ranchi", "Jharkhand"], ["Bhubaneswar", "Odisha"],
];

await connectDb();
let added = 0;
for (const [name, state] of CITIES) {
  const res = await City.updateOne({ slug: slugify(name) }, { $setOnInsert: { name, state, slug: slugify(name), isActive: true } }, { upsert: true });
  if (res.upsertedCount) added++;
}
console.log(`Cities: ${added} added, ${CITIES.length - added} already existed.`);
await disconnectDb();
