import * as Calendar from "expo-calendar";
import { Platform, Linking } from "react-native";

export type ShiftLike = {
  id: string;
  date: string;
  time_start: string;
  time_end?: string | null;
  vehicle?: string | null;
  patient_name?: string | null;
  notes?: string | null;
};

function buildDates(s: ShiftLike) {
  const [y, m, d] = s.date.split("-").map(Number);
  const [h1, mi1] = (s.time_start || "08:00").split(":").map(Number);
  const start = new Date(y, (m || 1) - 1, d || 1, h1 || 0, mi1 || 0);
  const end = new Date(start);
  if (s.time_end) {
    const [h2, mi2] = s.time_end.split(":").map(Number);
    end.setHours(h2 || h1 + 1);
    end.setMinutes(mi2 || mi1);
  } else {
    end.setHours(end.getHours() + 1);
  }
  return { start, end };
}

function buildTitle(s: ShiftLike) {
  return `Turno La Provvidenza${s.vehicle ? ` · ${s.vehicle}` : ""}`;
}

function buildNotes(s: ShiftLike) {
  return [
    s.patient_name ? `Paziente: ${s.patient_name}` : null,
    s.notes ? `Note: ${s.notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Export a shift to the device's default calendar.
 * On web, fallback to Google Calendar URL.
 */
export async function exportShiftToCalendar(s: ShiftLike): Promise<{ ok: boolean; message: string }> {
  const { start, end } = buildDates(s);
  const title = buildTitle(s);
  const notes = buildNotes(s);

  if (Platform.OS === "web") {
    const fmt = (d: Date) =>
      d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const url =
      "https://calendar.google.com/calendar/render?action=TEMPLATE" +
      `&text=${encodeURIComponent(title)}` +
      `&dates=${fmt(start)}/${fmt(end)}` +
      `&details=${encodeURIComponent(notes)}` +
      `&location=${encodeURIComponent("La Provvidenza ODV - Marsala")}`;
    Linking.openURL(url);
    return { ok: true, message: "Aperto Google Calendar nel browser" };
  }

  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== "granted") {
    return { ok: false, message: "Permesso al calendario negato" };
  }

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  // Prefer a writable, primary calendar
  const target = calendars.find((c) => c.allowsModifications && c.isPrimary) ||
    calendars.find((c) => c.allowsModifications);
  if (!target) {
    return { ok: false, message: "Nessun calendario scrivibile disponibile" };
  }
  await Calendar.createEventAsync(target.id, {
    title,
    startDate: start,
    endDate: end,
    notes,
    location: "La Provvidenza ODV - Marsala",
  });
  return { ok: true, message: `Aggiunto al calendario "${target.title}"` };
}
