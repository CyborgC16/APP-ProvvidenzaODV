import { useCallback, useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS, SPACING, RADIUS, SHADOW } from "@/src/theme";
import { api, Shift } from "@/src/api";
import { exportShiftToCalendar } from "@/src/utils/calendar-export";

export default function ShiftsAdmin() {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "servizio_civile" | "admin">("all");
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const today = new Date();
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0).toISOString().slice(0, 10);
      const params: any = { date_from: monthStart, date_to: monthEnd };
      if (filter !== "all") params.target_role = filter;
      setShifts(await api.listShifts(params));
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const grouped = shifts.reduce<Record<string, Shift[]>>((acc, s) => {
    (acc[s.date] ||= []).push(s);
    return acc;
  }, {});

  const remove = async (id: string) => {
    await api.deleteShift(id);
    load();
  };

  return (
    <SafeAreaView style={styles.safe} testID="shifts-admin-screen">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={COLORS.navy} />
        </Pressable>
        <Text style={styles.headerTitle}>Tutti i Turni</Text>
        <Pressable onPress={() => router.push("/admin/shift-new")} hitSlop={10} testID="new-shift">
          <Ionicons name="add-circle" size={26} color={COLORS.brand} />
        </Pressable>
      </View>

      <View style={styles.filterRow}>
        <Filter label="Tutti" active={filter === "all"} onPress={() => setFilter("all")} testID="f-all" />
        <Filter label="Servizio Civile" active={filter === "servizio_civile"} onPress={() => setFilter("servizio_civile")} testID="f-sc" />
        <Filter label="Volontari" active={filter === "admin"} onPress={() => setFilter("admin")} testID="f-vol" />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: SPACING.lg }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.brand} />}
      >
        {loading && shifts.length === 0 ? (
          <ActivityIndicator color={COLORS.brand} style={{ marginTop: 30 }} />
        ) : Object.keys(grouped).length === 0 ? (
          <Text style={styles.empty}>Nessun turno nel periodo.</Text>
        ) : (
          Object.entries(grouped).map(([date, list]) => (
            <View key={date} style={{ marginBottom: SPACING.lg }}>
              <Text style={styles.dateLabel}>{formatLong(date)}</Text>
              {list.map((s) => (
                <View key={s.id} style={styles.card} testID={`shift-${s.id}`}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>
                      {s.time_start}
                      {s.time_end ? ` - ${s.time_end}` : ""} · {s.assigned_user_name}
                    </Text>
                    <Text style={styles.cardLine}>
                      {s.target_role === "admin" ? "Volontario" : "Servizio Civile"}
                      {s.vehicle ? ` · ${s.vehicle}` : ""}
                    </Text>
                    {s.patient_name ? <Text style={styles.cardLine}>Pz: {s.patient_name}</Text> : null}
                    {s.notes ? <Text style={styles.cardNotes}>{s.notes}</Text> : null}
                  </View>
                  <Pressable onPress={() => exportShiftToCalendar(s)} style={styles.iconBtn} testID={`export-${s.id}`}>
                    <Ionicons name="calendar-outline" size={18} color={COLORS.brand} />
                  </Pressable>
                  <Pressable onPress={() => remove(s.id)} style={styles.iconBtn} testID={`del-${s.id}`}>
                    <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                  </Pressable>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Filter({ label, active, onPress, testID }: any) {
  return (
    <Pressable onPress={onPress} testID={testID} style={[styles.fchip, active && styles.fchipSel]}>
      <Text style={[styles.fchipText, active && { color: COLORS.white }]}>{label}</Text>
    </Pressable>
  );
}

function formatLong(d: string) {
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });
  } catch { return d; }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surfaceSecondary },
  headerTitle: { fontSize: 17, fontWeight: "700", color: COLORS.navy },
  filterRow: { flexDirection: "row", gap: SPACING.sm, padding: SPACING.md, backgroundColor: COLORS.surfaceSecondary, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  fchip: { flex: 1, paddingVertical: 10, borderRadius: RADIUS.pill, backgroundColor: COLORS.surfaceTertiary, alignItems: "center" },
  fchipSel: { backgroundColor: COLORS.brand },
  fchipText: { fontWeight: "700", color: COLORS.navy, fontSize: 12 },
  empty: { textAlign: "center", color: COLORS.onSurfaceMuted, marginTop: SPACING.xxl },
  dateLabel: { fontSize: 14, fontWeight: "700", color: COLORS.navy, marginBottom: SPACING.sm, textTransform: "capitalize" },
  card: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOW.card },
  cardTitle: { fontSize: 14, fontWeight: "700", color: COLORS.navy },
  cardLine: { fontSize: 12, color: COLORS.onSurface, marginTop: 2 },
  cardNotes: { fontSize: 11, color: COLORS.onSurfaceMuted, marginTop: 2, fontStyle: "italic" },
  iconBtn: { padding: 8, borderRadius: RADIUS.sm, backgroundColor: COLORS.surfaceTertiary },
});
