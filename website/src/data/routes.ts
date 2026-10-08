// SAMPLE DATA: replace with real routes and fares from the backend API later.

export type Route = {
  slug: string;
  from: string;
  to: string;
  km: number;
  duration: string;
  fareFrom: number;
  operators: number;
  types: string[];
  blurb: string;
};

export const routes: Route[] = [
  { slug: "delhi-to-manali", from: "Delhi", to: "Manali", km: 540, duration: "12h 30m", fareFrom: 1100, operators: 14, types: ["AC Sleeper", "Volvo Seater"], blurb: "An overnight run into the mountains, with pickups across Delhi and a morning arrival in Manali." },
  { slug: "delhi-to-jaipur", from: "Delhi", to: "Jaipur", km: 280, duration: "5h 45m", fareFrom: 450, operators: 22, types: ["AC Seater", "Non-AC Seater"], blurb: "One of the busiest routes in the north, with departures through the day and night." },
  { slug: "delhi-to-chandigarh", from: "Delhi", to: "Chandigarh", km: 250, duration: "5h 15m", fareFrom: 400, operators: 18, types: ["AC Seater", "Volvo Seater"], blurb: "Frequent, comfortable seater buses between the capital and Chandigarh." },
  { slug: "mumbai-to-pune", from: "Mumbai", to: "Pune", km: 150, duration: "3h 30m", fareFrom: 350, operators: 25, types: ["AC Seater", "Volvo Seater"], blurb: "A short expressway trip with buses leaving every few minutes at peak hours." },
  { slug: "mumbai-to-goa", from: "Mumbai", to: "Goa", km: 590, duration: "12h 00m", fareFrom: 900, operators: 16, types: ["AC Sleeper", "Non-AC Sleeper"], blurb: "Overnight sleepers along the coast, popular for weekend trips and holidays." },
  { slug: "bengaluru-to-chennai", from: "Bengaluru", to: "Chennai", km: 350, duration: "6h 30m", fareFrom: 600, operators: 20, types: ["AC Sleeper", "AC Seater"], blurb: "Day and night options between two of the south's biggest cities." },
  { slug: "bengaluru-to-hyderabad", from: "Bengaluru", to: "Hyderabad", km: 570, duration: "9h 30m", fareFrom: 850, operators: 19, types: ["AC Sleeper", "Volvo Seater"], blurb: "Comfortable overnight sleepers with flexible boarding points." },
  { slug: "hyderabad-to-vijayawada", from: "Hyderabad", to: "Vijayawada", km: 275, duration: "5h 15m", fareFrom: 500, operators: 21, types: ["AC Seater", "AC Sleeper"], blurb: "A steady, high-frequency route with buses at all hours." },
  { slug: "ahmedabad-to-mumbai", from: "Ahmedabad", to: "Mumbai", km: 530, duration: "9h 45m", fareFrom: 800, operators: 17, types: ["AC Sleeper", "Volvo Seater"], blurb: "Business and leisure travellers connecting Gujarat and Maharashtra." },
  { slug: "jaipur-to-udaipur", from: "Jaipur", to: "Udaipur", km: 395, duration: "7h 30m", fareFrom: 650, operators: 12, types: ["AC Seater", "AC Sleeper"], blurb: "A scenic route across Rajasthan, ideal for a heritage trip." },
  { slug: "kolkata-to-siliguri", from: "Kolkata", to: "Siliguri", km: 570, duration: "11h 30m", fareFrom: 950, operators: 11, types: ["AC Sleeper", "Non-AC Sleeper"], blurb: "The overnight gateway to the hills and the north-east." },
  { slug: "lucknow-to-delhi", from: "Lucknow", to: "Delhi", km: 555, duration: "8h 30m", fareFrom: 750, operators: 15, types: ["AC Sleeper", "Volvo Seater"], blurb: "A well-served overnight route between Uttar Pradesh and the capital." },
];

export function findRoute(slug: string | undefined) {
  return routes.find((r) => r.slug === slug);
}

// Sample departures for the route detail page.
export const sampleDepartures = [
  { operator: "Sample Travels A", type: "AC Sleeper (2+1)", dep: "20:30", arr: "09:00", seats: 12, factor: 1.0 },
  { operator: "Sample Travels B", type: "Volvo Seater (2+2)", dep: "21:15", arr: "09:45", seats: 5, factor: 0.9 },
  { operator: "Sample Travels C", type: "AC Sleeper (2+1)", dep: "22:00", arr: "10:30", seats: 18, factor: 1.15 },
  { operator: "Sample Travels D", type: "Non-AC Seater (2+3)", dep: "22:45", arr: "11:15", seats: 24, factor: 0.75 },
];
