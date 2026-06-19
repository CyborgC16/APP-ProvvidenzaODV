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

export default function NewShift() {
  const router = useRouter();
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [timeStart, setTimeStart] = useState("08:00");
  const [timeEnd, setTimeEnd] = useState("");
  const [targetRole, setTargetRole] = useState<"servizio_civile" | "admin">("servizio_civile");
  const [vehicle, setVehicle] = useState("");
  const [patientName, setPatientName] = useState("");
  const [notes, setNotes] = useState("");
  const [assignedUserId, setAssignedUserId] = useState<string>("");
  const [users, setUsers] = useState<UserPublic[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await api.listUsers();
      setUsers(list);
    } catch {}
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setAssignedUserId("");
  }, [targetRole]);

  const candidates = users.filter((u) => u.role === targetRole);

  const submit = async () => {
    if (!assignedUserId) return setErr("Seleziona un utente da assegnare");
    setSubmitting(true);
    setErr(null);
    try {
      await api.createShift({
        date,
        time_start: timeStart,
        time_end: timeEnd || undefined,
        assigned_user_id: assignedUserId,
        target_role: targetRole,
        vehicle: vehicle || undefined,
        patient_name: patientName || undefined,
        notes: notes || undefined,
      });
      router.back();
    } catch (e: any) {
      setErr(e.message || "Errore");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} testID="new-shift-screen">
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <Ionicons name="close" size={26} color={COLORS.navy} />
          </Pressable>
          <Text style={styles.headerTitle}>Nuovo Turno</Text>
          <View style={{ width: 26 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.lg }} keyboardShouldPersistTaps="handled">
          {err ? <Text style={styles.err}>{err}</Text> : null}

          <Text style={styles.label}>Calendario per</Text>
          <View style={styles.row}>
            <Pressable
              testID="target-sc"
              onPress={() => setTargetRole("servizio_civile")}
              style={[styles.chip, targetRole === "servizio_civile" && styles.chipSel]}
            >
              <Text style={[styles.chipText, targetRole === "servizio_civile" && { color: COLORS.white }]}>
                Servizio Civile
              </Text>
            </Pressable>
            <Pressable
              testID="target-admin"
              onPress={() => setTargetRole("admin")}
              style={[styles.chip, targetRole === "admin" && styles.chipSel]}
            >
              <Text style={[styles.chipText, targetRole === "admin" && { color: COLORS.white }]}>Admin</Text>
            </Pressable>
          </View>

          <Text style={styles.label}>Data (AAAA-MM-GG)</Text>
          <TextInput value={date} onChangeText={setDate} style={styles.input} autoCapitalize="none" testID="shift-date" />

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Inizio (HH:MM)</Text>
              <TextInput value={timeStart} onChangeText={setTimeStart} style={styles.input} testID="shift-time-start" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Fine (HH:MM)</Text>
              <TextInput value={timeEnd} onChangeText={setTimeEnd} style={styles.input} testID="shift-time-end" />
            </View>
          </View>

          <Text style={styles.label}>Auto / Mezzo assegnato</Text>
          <TextInput
            value={vehicle}
            onChangeText={setVehicle}
            style={styles.input}
            placeholder="es. Ambulanza 1 / Furgone Targa AB123CD"
            placeholderTextColor={COLORS.onSurfaceMuted}
            testID="shift-vehicle"
          />

          <Text style={styles.label}>
            Paziente {targetRole === "admin" ? "(opzionale)" : "(opzionale)"}
          </Text>
          <TextInput
            value={patientName}
            onChangeText={setPatientName}
            style={styles.input}
            placeholder="Nome paziente"
            placeholderTextColor={COLORS.onSurfaceMuted}
            testID="shift-patient"
          />

          <Text style={styles.label}>Note</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            style={[styles.input, { height: 70 }]}
            multiline
            testID="shift-notes"
          />

          <Text style={[styles.label, { marginTop: SPACING.md }]}>Assegnato a</Text>
          {candidates.length === 0 ? (
            <Text style={styles.muted}>Nessun utente disponibile per questo ruolo.</Text>
          ) : (
            candidates.map((u) => {
              const sel = assignedUserId === u.id;
              return (
                <Pressable
                  key={u.id}
                  testID={`assign-${u.id}`}
                  onPress={() => setAssignedUserId(u.id)}
                  style={[styles.userRow, sel && styles.userRowSel]}
                >
                  <Ionicons
                    name={sel ? "radio-button-on" : "radio-button-off"}
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
            testID="submit-shift"
            onPress={submit}
            disabled={submitting || !assignedUserId}
            style={[styles.primaryBtn, (submitting || !assignedUserId) && { opacity: 0.5 }]}
          >
            {submitting ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.primaryBtnText}>Crea Turno</Text>}
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
  row: { flexDirection: "row", gap: SPACING.sm },
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
