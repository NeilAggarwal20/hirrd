import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  clearNotifications,
  getNotifications,
  markAllNotificationsRead,
  seedWelcomeNotificationIfEmpty,
  subscribeToNotifications,
  type NotificationItem,
} from "@/lib/notifications";
import { formatRelativeDate } from "@/utils/format";

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => {
    seedWelcomeNotificationIfEmpty();
    return getNotifications();
  });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => subscribeToNotifications(() => setNotifications(getNotifications())), []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  function togglePanel() {
    const next = !isOpen;
    setIsOpen(next);
    if (next && unreadCount > 0) {
      setNotifications(markAllNotificationsRead());
    }
  }

  function handleClear() {
    clearNotifications();
  }

  return (
    <div className="relative" ref={containerRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={togglePanel}
        title="Notifications"
        aria-label="Toggle notifications"
        aria-expanded={isOpen}
        className="relative h-9 w-9 p-0 border-grid hover:border-ink hover:text-ink text-ink-soft transition-colors"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center bg-signal px-1 font-mono text-[9px] text-paper">
            {unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 border border-grid bg-paper p-4 shadow-lg z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-grid pb-2">
            <span className="font-mono text-xs uppercase tracking-wide text-ink-soft">Notifications</span>
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="font-mono text-[10px] uppercase text-ink-soft hover:text-signal transition-colors cursor-pointer"
              >
                Clear ×
              </button>
            )}
          </div>

          <div className="mt-2 max-h-72 overflow-y-auto divide-y divide-grid">
            {notifications.map((n) => (
              <div key={n.id} className="py-3 first:pt-1 last:pb-1">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-xs text-ink">{n.title}</span>
                  <span className="font-mono text-[9px] text-ink-soft uppercase shrink-0">
                    {formatRelativeDate(n.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-ink-soft leading-normal">{n.body}</p>
              </div>
            ))}

            {notifications.length === 0 && (
              <p className="py-6 text-center text-xs text-ink-soft">No new notifications.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
