import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, ActivityIndicator, ScrollView, Modal, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS, SPACING, RADIUS, SHADOW } from "@/src/theme";
import { api, Vehicle, VehicleInput } from "@/src/api";

const EMPTY: VehicleInput = { name: "", vehicle_type: "ambulanza", plate: "", notes: "" };

export default function Garage() {
  const router = useRouter();
  const [items, setItems] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<{ id?: string; data: VehicleInput } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api.listVehicles());
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      if (editing.id) await api.updateVehicle(editing.id, editing.data);
      else await api.createVehicle(editing.data);
      setEditing(null);
      load();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    await api.deleteVehicle(id);
    load();
  };

  return (
    <SafeAreaView style={styles.safe} testID="garage-screen">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="back">
          <Ionicons name="chevron-back" size={26} color={COLORS.navy} />
        </Pressable>
        <Text style={styles.headerTitle}>Garage</Text>
        <Pressable onPress={() => setEditing({ data: { ...EMPTY } })} hitSlop={10} testID="add-vehicle">
          <Ionicons name="add-circle" size={26} color={COLORS.brand} />
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.brand} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: SPACING.lg }}>
          {items.length === 0 && <Text style={styles.empty}>Nessun mezzo. Aggiungine uno col pulsante &quot;+&quot;.</Text>}
          {items.map((v) => (
            <View key={v.id} style={styles.card} testID={`vehicle-${v.id}`}>
              <View style={[styles.icon, { backgroundColor: COLORS.brandLight }]}>
                <Ionicons
                  name={v.vehicle_type === "ambulanza" ? "medical" : v.vehicle_type === "furgone" ? "bus" : "car"}
                  size={22}
                  color={COLORS.brand}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{v.name}</Text>
                <Text style={styles.cardLine}>
                  {v.vehicle_type === "ambulanza" ? "Ambulanza" : v.vehicle_type === "furgone" ? "Furgone" : "Altro"}
                  {v.plate ? ` · ${v.plate}` : ""}
                </Text>
                {v.notes ? <Text style={styles.cardNotes}>{v.notes}</Text> : null}
              </View>
              <Pressable onPress={() => setEditing({ id: v.id, data: { ...v } })} testID={`edit-${v.id}`} style={styles.iconBtn}>
                <Ionicons name="create-outline" size={18} color={COLORS.navy} />
              </Pressable>
              <Pressable onPress={() => remove(v.id)} testID={`del-${v.id}`} style={styles.iconBtn}>
                <Ionicons name="trash-outline" size={18} color={COLORS.error} />
              </Pressable>
            </View>
          ))}
        </ScrollView>
      )}

      <Modal visible={!!editing} animationType="slide" transparent onRequestClose={() => setEditing(null)}>
        <KeyboardAvoidingView style={styles.modal} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <ScrollView contentContainerStyle={styles.modalCard} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>{editing?.id ? "Modifica Mezzo" : "Nuovo Mezzo"}</Text>

            <Text style={styles.fieldLabel}>Nome*</Text>
            <TextInput
              value={editing?.data.name || ""}
              onChangeText={(v) => setEditing({ ...editing!, data: { ...editing!.data, name: v } })}
              placeholder="es. Ambulanza 1"
              placeholderTextColor={COLORS.onSurfaceMuted}
              style={styles.input}
              testID="vehicle-name"
            />

            <Text style={styles.fieldLabel}>Tipo</Text>
            <View style={{ flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.sm }}>
              {(["ambulanza", "furgone", "altro"] as const).map((t) => {
                const sel = editing?.data.vehicle_type === t;
                return (
                  <Pressable
                    key={t}
                    testID={`vt-${t}`}
                    onPress={() => setEditing({ ...editing!, data: { ...editing!.data, vehicle_type: t } })}
                    style={[styles.chip, sel && styles.chipSel]}
                  >
                    <Text style={[styles.chipText, sel && { color: COLORS.white }]}>
                      {t === "ambulanza" ? "Ambulanza" : t === "furgone" ? "Furgone" : "Altro"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>Targa</Text>
            <TextInput
              value={editing?.data.plate || ""}
              onChangeText={(v) => setEditing({ ...editing!, data: { ...editing!.data, plate: v } })}
              autoCapitalize="characters"
              style={styles.input}
              testID="vehicle-plate"
            />

            <Text style={styles.fieldLabel}>Note</Text>
            <TextInput
              value={editing?.data.notes || ""}
              onChangeText={(v) => setEditing({ ...editing!, data: { ...editing!.data, notes: v } })}
              multiline
              style={[styles.input, { height: 70, textAlignVertical: "top" }]}
              testID="vehicle-notes"
            />

            <View style={{ flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.md }}>
              <Pressable onPress={() => setEditing(null)} style={[styles.btn, styles.btnSec]}>
                <Text style={styles.btnSecText}>Annulla</Text>
              </Pressable>
              <Pressable
                onPress={save}
                disabled={saving || !editing?.data.name}
                style={[styles.btn, styles.btnPri, (!editing?.data.name || saving) && { opacity: 0.5 }]}
                testID="save-vehicle"
              >
                {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.btnPriText}>Salva</Text>}
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surfaceSecondary },
  headerTitle: { fontSize: 17, fontWeight: "700", color: COLORS.navy },
  empty: { textAlign: "center", color: COLORS.onSurfaceMuted, marginTop: SPACING.xxl },
  card: { flexDirection: "row", alignItems: "center", gap: SPACING.md, backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOW.card },
  icon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  cardTitle: { fontSize: 15, fontWeight: "700", color: COLORS.navy },
  cardLine: { fontSize: 12, color: COLORS.onSurfaceMuted, marginTop: 2 },
  cardNotes: { fontSize: 11, color: COLORS.onSurfaceMuted, marginTop: 2, fontStyle: "italic" },
  iconBtn: { padding: 8, borderRadius: RADIUS.sm, backgroundColor: COLORS.surfaceTertiary },
  modal: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg, padding: SPACING.lg, maxHeight: "92%" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: COLORS.navy, marginBottom: SPACING.md, textAlign: "center" },
  fieldLabel: { fontSize: 12, color: COLORS.onSurfaceMuted, marginBottom: 4, fontWeight: "600" },
  input: { backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.sm, paddingHorizontal: SPACING.md, paddingVertical: 10, fontSize: 14, borderWidth: 1, borderColor: COLORS.border },
  chip: { flex: 1, paddingVertical: 10, borderRadius: RADIUS.sm, backgroundColor: COLORS.surfaceSecondary, borderWidth: 1, borderColor: COLORS.border, alignItems: "center" },
  chipSel: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText: { fontWeight: "600", color: COLORS.navy, fontSize: 13 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: RADIUS.md, alignItems: "center" },
  btnPri: { backgroundColor: COLORS.brand },
  btnPriText: { color: COLORS.white, fontWeight: "700" },
  btnSec: { backgroundColor: COLORS.surfaceTertiary },
  btnSecText: { color: COLORS.navy, fontWeight: "600" },
});
