import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { api, PresenceItem } from "@/src/api";
import { COLORS, RADIUS, SHADOW, SPACING } from "@/src/theme";

const OPTIONS = [
  { mode: "automatico" as const, label: "Automatico", icon: "sync-outline" },
  { mode: "disponibile" as const, label: "Disponibile", icon: "checkmark-circle-outline" },
  { mode: "impegnato" as const, label: "Impegnato", icon: "time-outline" },
  { mode: "non_disponibile" as const, label: "Non disponibile", icon: "remove-circle-outline" },
];

const DURATIONS = [
  { value: 30, label: "30 min" },
  { value: 60, label: "1 ora" },
  { value: 120, label: "2 ore" },
  { value: 720, label: "Fine giornata" },
];

const STATUS_LABEL: Record<string, string> = {
  disponibile: "Disponibile",
  impegnato: "Impegnato in servizio",
  non_disponibile: "Non disponibile",
  offline: "Offline",
};

const STATUS_COLOR: Record<string, string> = {
  disponibile: "#22C55E",
  impegnato: "#F97316",
  non_disponibile: "#EF4444",
  offline: "#94A3B8",
};

export default function PresenceStatusCard() {
  const [presence, setPresence] = useState<PresenceItem | null>(null);
  const [duration, setDuration] = useState(60);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setPresence(await api.myPresence());
    } catch {}
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), 30_000);
    return () => clearInterval(timer);
  }, [load]);

  const setMode = async (mode: "automatico" | "disponibile" | "impegnato" | "non_disponibile") => {
    setSaving(true);
    try {
      setPresence(await api.updateMyPresence(mode, mode === "automatico" ? undefined : duration));
    } finally {
      setSaving(false);
    }
  };

  const color = STATUS_COLOR[presence?.status || "offline"];
  return (
    <View style={styles.card}>
      <View style={styles.titleRow}>
        <View>
          <Text style={styles.eyebrow}>IL MIO STATO</Text>
          <Text style={styles.title}>{STATUS_LABEL[presence?.status || "offline"]}</Text>
          <Text style={styles.source}>Gestione: {presence?.source || "automatico"}</Text>
        </View>
        <View style={[styles.dot, { backgroundColor: color }]} />
      </View>
      <View style={styles.options}>
        {OPTIONS.map((item) => (
          <Pressable key={item.mode} onPress={() => void setMode(item.mode)} disabled={saving} style={styles.option}>
            <Ionicons name={item.icon as any} size={18} color={COLORS.navy} />
            <Text style={styles.optionText}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.durationTitle}>Durata dello stato manuale</Text>
      <View style={styles.durations}>
        {DURATIONS.map((item) => (
          <Pressable key={item.value} onPress={() => setDuration(item.value)} style={[styles.duration, duration === item.value && styles.durationActive]}>
            <Text style={[styles.durationText, duration === item.value && styles.durationTextActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
      {saving ? <ActivityIndicator color={COLORS.brand} style={{ marginTop: SPACING.sm }} /> : null}
      <Text style={styles.note}>Un Servizio o un turno in corso ha sempre la precedenza e imposta automaticamente lo stato arancione.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { margin: SPACING.lg, marginBottom: 0, padding: SPACING.lg, borderRadius: RADIUS.lg, backgroundColor: COLORS.surfaceSecondary, ...SHADOW.card },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  eyebrow: { fontSize: 11, color: COLORS.brand, fontWeight: "800", letterSpacing: 1 },
  title: { fontSize: 20, color: COLORS.navy, fontWeight: "800", marginTop: 3 },
  source: { fontSize: 12, color: COLORS.onSurfaceMuted, marginTop: 2 },
  dot: { width: 20, height: 20, borderRadius: 10 },
  options: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm, marginTop: SPACING.md },
  option: { width: "48%", minHeight: 44, flexDirection: "row", alignItems: "center", gap: 7, padding: 10, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceTertiary },
  optionText: { fontSize: 12, fontWeight: "700", color: COLORS.navy, flexShrink: 1 },
  durationTitle: { fontSize: 12, fontWeight: "700", color: COLORS.navy, marginTop: SPACING.md },
  durations: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: SPACING.sm },
  duration: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: RADIUS.pill, backgroundColor: COLORS.surfaceTertiary },
  durationActive: { backgroundColor: COLORS.brand },
  durationText: { color: COLORS.navy, fontSize: 11, fontWeight: "700" },
  durationTextActive: { color: COLORS.white },
  note: { marginTop: SPACING.md, fontSize: 11, lineHeight: 16, color: COLORS.onSurfaceMuted },
});
