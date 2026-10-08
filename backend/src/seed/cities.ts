import { slugify } from "../lib/ids.js";
import { City } from "../models/City.js";

export const CITIES: [name: string, state: string][] = [
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

/** Adds any missing cities. Existing ones (same slug) are left unchanged. Returns how many were added. */
export async function ensureCities() {
  let added = 0;
  for (const [name, state] of CITIES) {
    const slug = slugify(name);
    const res = await City.updateOne({ slug }, { $setOnInsert: { name, state, slug, isActive: true } }, { upsert: true });
    if (res.upsertedCount) added++;
  }
  return { added, existing: CITIES.length - added };
}
