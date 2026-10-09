// SAMPLE DATA: replace with the real city list from the backend (GET /cities) later.

export const popularCities = ["Delhi", "Mumbai", "Bengaluru", "Hyderabad", "Jaipur", "Pune", "Chennai", "Ahmedabad"];

export const cities = [
  ...popularCities,
  "Agra", "Amritsar", "Bhopal", "Chandigarh", "Dehradun", "Goa", "Indore", "Kochi", "Kolkata",
  "Lucknow", "Manali", "Nagpur", "Patna", "Siliguri", "Surat", "Udaipur", "Varanasi", "Vijayawada",
].sort((a, b) => a.localeCompare(b));
