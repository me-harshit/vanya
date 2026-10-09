// DEMO login: replace with the real API (POST /auth/otp/request, POST /auth/otp/verify) later.
// Rules copied from the backend so the screens behave the same: 6-digit code, resend after 30 seconds,
// 5 wrong tries allowed. In this demo any 6 digits work, except 000000 which always fails (to show the error).

import { useSyncExternalStore } from "react";

export const OTP_RESEND_SECONDS = 30;
export const OTP_MAX_ATTEMPTS = 5;
export const DEMO_BAD_CODE = "000000";

export type Session = { phone: string };
const KEY = "vanya-session";

function read(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

let session: Session | null = read();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function useSession(): Session | null {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => session,
  );
}
export function getSession() {
  return session;
}
export function login(phone: string) {
  session = { phone };
  try { localStorage.setItem(KEY, JSON.stringify(session)); } catch { /* storage unavailable: logged in for this visit only */ }
  emit();
}
export function logout() {
  session = null;
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  emit();
}

// Only allow in-site paths after login, so a crafted link cannot send someone to another website.
export function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/my-bookings";
}
