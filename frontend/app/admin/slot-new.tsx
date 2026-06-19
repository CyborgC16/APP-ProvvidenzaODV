import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS, SPACING, RADIUS, SHADOW } from "@/src/theme";
import { api, UserPublic } from "@/src/api";

export default function NewSlot() {
  const router = useRouter();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("09:00");
  const [vehicleType, setVehicleType] = useState<"ambulanza" | "furgone">("ambulanza");
  const [capacity, setCapacity] = useState("1");
  const [notes, setNotes] = useState("");
  const [assigned, setAssigned] = useState<string[]>([]);
  const [users, setUsers] = useState<UserPublic[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await api.listUsers();
      setUsers(list.filter((u) => u.role === "servizio_civile"));
    } catch {}
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const toggle = (id: string) =>
    setAssigned((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = async () => {
    setSubmitting(true);
    setErr(null);
    try {
      await api.createSlot({
        date,
        time,
        vehicle_type: vehicleType,
        capacity: parseInt(capacity || "1", 10),
        assigned_user_ids: assigned,
        notes: notes.trim() || undefined,
      });
      router.back();
    } catch (e: any) {
      setErr(e.message || "Errore creazione slot");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} testID="new-slot-screen">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10} testID="back-btn">
            <Ionicons name="close" size={26} color={COLORS.navy} />
          </Pressable>
          <Text style={styles.headerTitle}>Nuovo Slot</Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.lg }} keyboardShouldPersistTaps="handled">
          {err ? <Text style={styles.err}>{err}</Text> : null}

          <Text style={styles.label}>Data (AAAA-MM-GG)</Text>
          <TextInput value={date} onChangeText={setDate} style={styles.input} testID="slot-date" autoCapitalize="none" />

          <Text style={styles.label}>Orario (HH:MM)</Text>
          <TextInput value={time} onChangeText={setTime} style={styles.input} testID="slot-time" />

          <Text style={styles.label}>Tipo di Mezzo</Text>
          <View style={{ flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.md }}>
            <Pressable
              testID="slot-vehicle-amb"
              onPress={() => setVehicleType("ambulanza")}
              style={[styles.chip, vehicleType === "ambulanza" && styles.chipSel]}
            >
              <Text style={[styles.chipText, vehicleType === "ambulanza" && { color: COLORS.white }]}>
                Ambulanza
              </Text>
            </Pressable>
            <Pressable
              testID="slot-vehicle-furg"
              onPress={() => setVehicleType("furgone")}
              style={[styles.chip, vehicleType === "furgone" && styles.chipSel]}
            >
              <Text style={[styles.chipText, vehicleType === "furgone" && { color: COLORS.white }]}>Furgone</Text>
            </Pressable>
          </View>

          <Text style={styles.label}>Capienza</Text>
          <TextInput
            value={capacity}
            onChangeText={setCapacity}
            keyboardType="numeric"
            style={styles.input}
            testID="slot-capacity"
          />

          <Text style={styles.label}>Note</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            style={[styles.input, { height: 70 }]}
            multiline
            testID="slot-notes"
          />

          <Text style={[styles.label, { marginTop: SPACING.md }]}>Volontari Servizio Civile assegnati</Text>
          {users.length === 0 ? (
            <Text style={styles.muted}>Nessun utente Servizio Civile. Creane uno dalla sezione Utenti.</Text>
          ) : (
            users.map((u) => {
              const sel = assigned.includes(u.id);
              return (
                <Pressable
                  key={u.id}
                  testID={`assign-${u.id}`}
                  onPress={() => toggle(u.id)}
                  style={[styles.userRow, sel && styles.userRowSel]}
                >
                  <Ionicons
                    name={sel ? "checkbox" : "square-outline"}
                    size={22}
                    color={sel ? COLORS.brand : COLORS.onSurfaceMuted}
                  />
                  <Text style={styles.userRowText}>
                    {u.full_name} · @{u.username}
                  </Text>
                </Pressable>
              );
            })
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            testID="submit-slot"
            onPress={submit}
            disabled={submitting}
            style={[styles.primaryBtn, submitting && { opacity: 0.5 }]}
          >
            {submitting ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.primaryBtnText}>Crea Slot</Text>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surfaceSecondary,
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: COLORS.navy },
  err: { color: COLORS.error, marginBottom: SPACING.md, textAlign: "center" },
  label: { fontSize: 12, color: COLORS.onSurfaceMuted, marginBottom: 6, marginTop: SPACING.sm, fontWeight: "600" },
  input: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.onSurface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  chip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  chipSel: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText: { fontWeight: "600", color: COLORS.navy },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.sm,
    marginBottom: 6,
    ...SHADOW.card,
  },
  userRowSel: { borderWidth: 1, borderColor: COLORS.brand },
  userRowText: { fontSize: 14, color: COLORS.navy, fontWeight: "600" },
  muted: { color: COLORS.onSurfaceMuted, fontSize: 13 },
  footer: { padding: SPACING.lg, borderTopWidth: 1, borderTopColor: COLORS.border, backgroundColor: COLORS.surface },
  primaryBtn: { backgroundColor: COLORS.brand, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: "center" },
  primaryBtnText: { color: COLORS.white, fontWeight: "700", fontSize: 15 },
});
