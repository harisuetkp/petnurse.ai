import { useEffect, useRef } from "react";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { CareReminder } from "@/hooks/useCareReminders";
import { useLanguage } from "@/contexts/LanguageContext";

/**
 * Checks upcoming/overdue care reminders and fires browser/native notifications.
 * Runs once per session (per mount) to avoid spamming.
 */
export function useReminderNotifications(reminders: CareReminder[]) {
  const { isEnabled, sendNotification } = usePushNotifications();
  const { t } = useLanguage();
  const hasFired = useRef(false);

  useEffect(() => {
    if (!isEnabled || hasFired.current || reminders.length === 0) return;
    hasFired.current = true;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dueToday: CareReminder[] = [];
    const dueSoon: CareReminder[] = [];
    const overdue: CareReminder[] = [];

    for (const r of reminders) {
      if (r.completed_at) continue;
      const due = new Date(r.due_date + "T00:00:00");
      const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diff < 0) overdue.push(r);
      else if (diff === 0) dueToday.push(r);
      else if (diff <= 2) dueSoon.push(r);
    }

    const all = [...overdue, ...dueToday, ...dueSoon];
    if (all.length === 0) return;

    const timer = setTimeout(() => {
      // Overdue (max 2)
      for (const r of overdue.slice(0, 2)) {
        sendNotification(t("notif.overdue", { title: r.title }), {
          body: t("notif.overdueBody", { category: r.category.replace("_", " "), date: r.due_date }),
          tag: `reminder-overdue-${r.id}`,
        });
      }

      // Due today
      if (dueToday.length === 1) {
        sendNotification(t("notif.dueToday", { title: dueToday[0].title }), {
          body: t("notif.dueTodayBody", { name: "", category: dueToday[0].category.replace("_", " ") }),
          tag: `reminder-today-${dueToday[0].id}`,
        });
      } else if (dueToday.length > 1) {
        sendNotification(t("notif.dueTodayBatch", { count: dueToday.length }), {
          body: t("notif.dueTodayBatchBody", { count: dueToday.length }),
          tag: "reminders-today-batch",
        });
      }

      // Upcoming (2 days)
      if (dueSoon.length === 1) {
        const days = Math.ceil((new Date(dueSoon[0].due_date + "T00:00:00").getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        sendNotification(t("notif.upcoming", { title: dueSoon[0].title }), {
          body: t("notif.upcomingBody", { days }),
          tag: `reminder-soon-${dueSoon[0].id}`,
        });
      } else if (dueSoon.length > 1) {
        sendNotification(t("notif.upcomingBatch", { count: dueSoon.length }), {
          body: t("notif.upcomingBatchBody", { count: dueSoon.length }),
          tag: "reminders-soon-batch",
        });
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [isEnabled, reminders, sendNotification, t]);
}
