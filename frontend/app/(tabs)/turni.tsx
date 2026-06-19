import { useCallback, useState } from "react";
import { ScrollView, View, Text, StyleSheet, RefreshControl, ActivityIndicator } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS, SPACING, RADIUS, SHADOW } from "@/src/theme";
import { api, Shift } from "@/src/api";
import { useAuth } from "@/src/auth";
import { useI18n } from "@/src/i18n";
import LangToggle from "@/src/components/LangToggle";

export default function Turni() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { t } = useI18n();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await api.myShifts();
      setShifts(s);
    } catch {
      // unauthorized → redirect to login
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!authLoading && !user) {
        router.replace("/(tabs)/account");
        return;
      }
      load();
    }, [authLoading, user, router, load]),
  );

  const grouped = shifts.reduce<Record<string, Shift[]>>((acc, s) => {
    (acc[s.date] ||= []).push(s);
    return acc;
  }, {});

  return (
    <SafeAreaView style={styles.safe} edges={["top"]} testID="turni-screen">
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t("shift_title")}</Text>
          <Text style={styles.subtitle}>{user?.full_name}</Text>
        </View>
        <LangToggle />
      </View>

      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.brand} />}
      >
        {loading && shifts.length === 0 ? (
          <ActivityIndicator color={COLORS.brand} style={{ marginTop: 40 }} />
        ) : Object.keys(grouped).length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="calendar-outline" size={48} color={COLORS.onSurfaceMuted} />
            <Text style={styles.empty}>{t("dash_empty_shifts")}</Text>
          </View>
        ) : (
          Object.entries(grouped).map(([date, list]) => (
            <View key={date} style={{ marginBottom: SPACING.lg }}>
              <Text style={styles.dateLabel}>{formatLong(date)}</Text>
              {list.map((s) => (
                <View key={s.id} style={styles.card} testID={`shift-${s.id}`}>
                  <View style={[styles.icon, { backgroundColor: COLORS.brandLight }]}>
                    <Ionicons name="time" size={20} color={COLORS.brand} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>
                      {s.time_start}
                      {s.time_end ? ` - ${s.time_end}` : ""}
                    </Text>
                    {s.vehicle ? (
                      <Text style={styles.cardLine}>
                        <Text style={{ fontWeight: "700" }}>{t("shift_vehicle")} </Text>
                        {s.vehicle}
                      </Text>
                    ) : null}
                    {s.patient_name ? (
                      <Text style={styles.cardLine}>
                        <Text style={{ fontWeight: "700" }}>{t("shift_patient")} </Text>
                        {s.patient_name}
                      </Text>
                    ) : null}
                    {s.notes ? (
                      <Text style={styles.cardNotes}>
                        <Text style={{ fontWeight: "700" }}>{t("shift_notes")} </Text>
                        {s.notes}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function formatLong(d: string) {
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("it-IT", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  } catch {
    return d;
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.lg,
    gap: SPACING.md,
    backgroundColor: COLORS.surfaceSecondary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { fontSize: 18, fontWeight: "700", color: COLORS.navy },
  subtitle: { fontSize: 12, color: COLORS.onSurfaceMuted, marginTop: 2 },
  body: { padding: SPACING.lg },
  emptyBox: { alignItems: "center", padding: SPACING.xxl, gap: SPACING.md },
  empty: { fontSize: 14, color: COLORS.onSurfaceMuted, textAlign: "center" },
  dateLabel: { fontSize: 14, fontWeight: "700", color: COLORS.navy, marginBottom: SPACING.sm, textTransform: "capitalize" },
  card: {
    flexDirection: "row",
    gap: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    ...SHADOW.card,
  },
  icon: { width: 40, height: 40, borderRadius: RADIUS.pill, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 15, fontWeight: "700", color: COLORS.navy },
  cardLine: { fontSize: 13, color: COLORS.onSurface, marginTop: 2 },
  cardNotes: { fontSize: 12, color: COLORS.onSurfaceMuted, marginTop: 4, fontStyle: "italic" },
});
