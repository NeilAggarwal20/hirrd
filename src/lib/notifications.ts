export type NotificationType =
  | "application_submitted"
  | "profile_viewed"
  | "interview_scheduled"
  | "job_saved"
  | "role_updated";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string; // ISO timestamp
  read: boolean;
}

const STORAGE_KEY = "hirrd:notifications";
const CHANGE_EVENT = "hirrd:notifications-changed";
const MAX_STORED = 30;

function readAll(): NotificationItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as NotificationItem[]) : [];
  } catch {
    return [];
  }
}

function writeAll(items: NotificationItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function getNotifications(): NotificationItem[] {
  return readAll();
}

/**
 * The single entry point for adding a notification. Every real action
 * in this app that should notify the user calls this. A future
 * backend-driven version (e.g. a `notifications` table + Supabase
 * Realtime subscription) would call this same function from its
 * subscription callback — nothing else in the app would need to
 * change.
 */
export function pushNotification(input: { type: NotificationType; title: string; body: string }): void {
  const item: NotificationItem = {
    id: typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    type: input.type,
    title: input.title,
    body: input.body,
    createdAt: new Date().toISOString(),
    read: false,
  };
  writeAll([item, ...readAll()].slice(0, MAX_STORED));
}

export function markAllNotificationsRead(): NotificationItem[] {
  const updated = readAll().map((n) => ({ ...n, read: true }));
  writeAll(updated);
  return updated;
}

export function clearNotifications(): void {
  writeAll([]);
}

/** Fires `callback` whenever notifications change, in this tab or another. */
export function subscribeToNotifications(callback: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/** Seeds a one-time welcome notification for brand-new sessions. */
export function seedWelcomeNotificationIfEmpty(): void {
  if (readAll().length > 0) return;
  pushNotification({
    type: "role_updated",
    title: "Welcome to HIRRD",
    body: "Your profile is set up. Complete onboarding to start browsing or posting roles.",
  });
}
