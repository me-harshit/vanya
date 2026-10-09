// DEMO data: replace with API calls when the backend is connected (operator profile, KYC documents, listing mode).

import { useSyncExternalStore } from "react";

export type DocStatus = "verified" | "pending" | "missing" | "rejected";
export type Doc = { id: string; label: string; hint: string; status: DocStatus; file?: string; note?: string };
export type ListingMode = "direct" | "own_erp" | "third_party";

export type Profile = {
  business: string; owner: string; phone: string; email: string; city: string; address: string; gstin: string; pan: string;
  bank: { holder: string; account: string; ifsc: string; bankName: string };
  docs: Doc[];
  notify: { booking: boolean; cancellation: boolean; settlement: boolean; sms: boolean };
  mode: ListingMode;
  erp: { vendor: string; baseUrl: string; apiKey: string; connected: boolean; lastSync: number | null };
};

let profile: Profile = {
  business: "Shree Ganesh Travels", owner: "Rakesh Sharma", phone: "9876543210", email: "rakesh@shreeganesh.example", city: "Delhi",
  address: "14, Transport Nagar, Delhi 110007", gstin: "07ABCDE1234F1Z5", pan: "ABCDE1234F",
  bank: { holder: "Shree Ganesh Travels", account: "004512345678", ifsc: "HDFC0000045", bankName: "HDFC Bank" },
  docs: [
    { id: "gst", label: "GST certificate", hint: "PDF or photo", status: "verified" },
    { id: "pan", label: "PAN card", hint: "Of the business or the owner", status: "verified" },
    { id: "rc", label: "Bus registration (RC)", hint: "One per bus, you can add more later", status: "pending", file: "rc-RJ14PA2210.pdf" },
    { id: "permit", label: "Route permit", hint: "Tourist or contract carriage permit", status: "rejected", note: "The permit photo was blurry. Please upload a clearer copy." },
    { id: "cheque", label: "Cancelled cheque", hint: "To confirm your bank account", status: "missing" },
  ],
  notify: { booking: true, cancellation: true, settlement: true, sms: false },
  mode: "direct",
  erp: { vendor: "", baseUrl: "", apiKey: "", connected: false, lastSync: null },
};
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function useProfile(): Profile {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => profile,
  );
}
export function updateProfile(patch: Partial<Profile>) {
  profile = { ...profile, ...patch };
  emit();
}
// Only the file NAME is kept in this demo. The file itself is never read or uploaded.
export function setDocFile(id: string, file: string) {
  profile = { ...profile, docs: profile.docs.map((d) => (d.id === id ? { ...d, status: "pending", file, note: undefined } : d)) };
  emit();
}

export const vendors = ["Bitla Software (Ticketsimply)", "eTravelSmart", "Other booking software"];
