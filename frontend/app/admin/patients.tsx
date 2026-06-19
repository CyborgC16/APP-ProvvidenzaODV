import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Linking,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS, SPACING, RADIUS, SHADOW } from "@/src/theme";
import { api, Patient, PatientInput } from "@/src/api";

const EMPTY: PatientInput = {
  first_name: "",
  last_name: "",
  address: "",
  dialysis_center: "",
  dialysis_schedule: "",
  phone: "",
  notes: "",
  map_url: "",
};

export default function Patients() {
  const router = useRouter();
  const [items, setItems] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<{ id?: string; data: PatientInput } | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api.listPatients());
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
      if (editing.id) await api.updatePatient(editing.id, editing.data);
      else await api.createPatient(editing.data);
      setEditing(null);
      await load();
    } catch (e) {
      console.warn(e);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    await api.deletePatient(id);
    load();
  };

  const openMap = (p: Patient) => {
    const url = p.map_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address)}`;
    Linking.openURL(url);
  };

  return (
    <SafeAreaView style={styles.safe} testID="patients-screen">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} testID="back">
          <Ionicons name="chevron-back" size={26} color={COLORS.navy} />
        </Pressable>
        <Text style={styles.headerTitle}>Pz Dializzati</Text>
        <Pressable onPress={() => setEditing({ data: { ...EMPTY } })} hitSlop={10} testID="add-patient">
          <Ionicons name="add-circle" size={26} color={COLORS.brand} />
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.brand} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: SPACING.lg }}>
          {items.length === 0 && (
            <Text style={styles.empty}>Nessun paziente. Aggiungi il primo con il pulsante &quot;+&quot;.</Text>
          )}
          {items.map((p) => (
            <View key={p.id} style={styles.card} testID={`patient-${p.id}`}>
              <Text style={styles.cardTitle}>
                {p.first_name} {p.last_name}
              </Text>
              <View style={styles.cardRow}>
                <Ionicons name="location" size={14} color={COLORS.brand} />
                <Text style={styles.cardLine}>{p.address}</Text>
              </View>
              <View style={styles.cardRow}>
                <Ionicons name="medkit" size={14} color={COLORS.brand} />
                <Text style={styles.cardLine}>{p.dialysis_center}</Text>
              </View>
              <View style={styles.cardRow}>
                <Ionicons name="time" size={14} color={COLORS.brand} />
                <Text style={styles.cardLine}>{p.dialysis_schedule}</Text>
              </View>
              {p.phone ? (
                <View style={styles.cardRow}>
                  <Ionicons name="call" size={14} color={COLORS.brand} />
                  <Text style={styles.cardLine}>{p.phone}</Text>
                </View>
              ) : null}
              {p.notes ? <Text style={styles.cardNotes}>{p.notes}</Text> : null}

              <View style={styles.actions}>
                <Pressable onPress={() => openMap(p)} style={styles.mapBtn} testID={`map-${p.id}`}>
                  <Ionicons name="map" size={16} color={COLORS.white} />
                  <Text style={styles.mapBtnText}>Apri in Maps</Text>
                </Pressable>
                <Pressable onPress={() => setEditing({ id: p.id, data: { ...p } })} testID={`edit-${p.id}`} style={styles.iconBtn}>
                  <Ionicons name="create-outline" size={18} color={COLORS.navy} />
                </Pressable>
                <Pressable onPress={() => remove(p.id)} testID={`del-${p.id}`} style={styles.iconBtn}>
                  <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <Modal visible={!!editing} animationType="slide" transparent onRequestClose={() => setEditing(null)}>
        <KeyboardAvoidingView style={styles.modal} behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <ScrollView contentContainerStyle={styles.modalCard} keyboardShouldPersistTaps="handled">
            <Text style={styles.modalTitle}>{editing?.id ? "Modifica Paziente" : "Nuovo Paziente"}</Text>
            <Field label="Nome*" value={editing?.data.first_name || ""} onChange={(v) => setEditing({ ...editing!, data: { ...editing!.data, first_name: v } })} />
            <Field label="Cognome*" value={editing?.data.last_name || ""} onChange={(v) => setEditing({ ...editing!, data: { ...editing!.data, last_name: v } })} />
            <Field label="Indirizzo*" value={editing?.data.address || ""} onChange={(v) => setEditing({ ...editing!, data: { ...editing!.data, address: v } })} />
            <Field label="Centro Dialisi*" value={editing?.data.dialysis_center || ""} onChange={(v) => setEditing({ ...editing!, data: { ...editing!.data, dialysis_center: v } })} />
            <Field label="Orari Dialisi*" value={editing?.data.dialysis_schedule || ""} onChange={(v) => setEditing({ ...editing!, data: { ...editing!.data, dialysis_schedule: v } })} placeholder="es. Lun-Mer-Ven 14:00-18:00" />
            <Field label="Telefono" value={editing?.data.phone || ""} onChange={(v) => setEditing({ ...editing!, data: { ...editing!.data, phone: v } })} keyboardType="phone-pad" />
            <Field label="Link Google Maps (opzionale)" value={editing?.data.map_url || ""} onChange={(v) => setEditing({ ...editing!, data: { ...editing!.data, map_url: v } })} autoCapitalize="none" />
            <Field label="Note" value={editing?.data.notes || ""} onChange={(v) => setEditing({ ...editing!, data: { ...editing!.data, notes: v } })} multiline />

            <View style={{ flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.lg }}>
              <Pressable onPress={() => setEditing(null)} style={[styles.btn, styles.btnSec]}>
                <Text style={styles.btnSecText}>Annulla</Text>
              </Pressable>
              <Pressable onPress={save} disabled={saving} style={[styles.btn, styles.btnPri, saving && { opacity: 0.5 }]} testID="save-patient">
                {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.btnPriText}>Salva</Text>}
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function Field({ label, value, onChange, placeholder, keyboardType, autoCapitalize, multiline }: any) {
  return (
    <View style={{ marginBottom: SPACING.sm }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={COLORS.onSurfaceMuted}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        style={[styles.input, multiline && { height: 70, textAlignVertical: "top" }]}
      />
    </View>
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
  empty: { textAlign: "center", color: COLORS.onSurfaceMuted, marginTop: SPACING.xxl },
  card: { backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm, ...SHADOW.card },
  cardTitle: { fontSize: 15, fontWeight: "700", color: COLORS.navy, marginBottom: SPACING.xs },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  cardLine: { fontSize: 13, color: COLORS.onSurface, flex: 1 },
  cardNotes: { fontSize: 12, color: COLORS.onSurfaceMuted, marginTop: 6, fontStyle: "italic" },
  actions: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, marginTop: SPACING.md },
  mapBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.brand,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
  },
  mapBtnText: { color: COLORS.white, fontWeight: "700", fontSize: 13 },
  iconBtn: { padding: 8, borderRadius: RADIUS.sm, backgroundColor: COLORS.surfaceTertiary },
  modal: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg, padding: SPACING.lg, maxHeight: "92%" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: COLORS.navy, marginBottom: SPACING.md, textAlign: "center" },
  fieldLabel: { fontSize: 12, color: COLORS.onSurfaceMuted, marginBottom: 4, fontWeight: "600" },
  input: { backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.sm, paddingHorizontal: SPACING.md, paddingVertical: 10, fontSize: 14, borderWidth: 1, borderColor: COLORS.border },
  btn: { flex: 1, paddingVertical: 14, borderRadius: RADIUS.md, alignItems: "center" },
  btnPri: { backgroundColor: COLORS.brand },
  btnPriText: { color: COLORS.white, fontWeight: "700" },
  btnSec: { backgroundColor: COLORS.surfaceTertiary },
  btnSecText: { color: COLORS.navy, fontWeight: "600" },
});
