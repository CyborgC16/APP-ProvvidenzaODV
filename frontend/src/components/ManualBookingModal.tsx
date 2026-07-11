import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { COLORS, SPACING, RADIUS } from "@/src/theme";
import { api } from "@/src/api";

const TIME_OPTIONS = ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00"];

type Props = {
  visible: boolean;
  date: string; // preselected day
  onClose: () => void;
  onSaved: () => void;
};

export default function ManualBookingModal({ visible, date, onClose, onSaved }: Props) {
  const [vehicle, setVehicle] = useState<"ambulanza" | "furgone">("ambulanza");
  const [time, setTime] = useState("09:00");
  const [requesterName, setRequesterName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [patientName, setPatientName] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setVehicle("ambulanza");
      setTime("09:00");
      setRequesterName("");
      setPhone("");
      setEmail("");
      setPatientName("");
      setAddress("");
      setNotes("");
    }
  }, [visible]);

  const save = async () => {
    if (!requesterName.trim()) {
      Alert.alert("Attenzione", "Inserisci il nome di chi ha prenotato");
      return;
    }
    setSaving(true);
    try {
      await api.createManualBooking({
        date,
        time,
        vehicle_type: vehicle,
        requester_name: requesterName.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        patient_name: patientName.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onSaved();
      onClose();
    } catch (e: any) {
      Alert.alert("Errore", (e && e.message) || "Impossibile registrare la prenotazione");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.card} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Prenotazione Manuale</Text>
          <Text style={styles.subtitle}>Registra una richiesta arrivata per telefono o email · {date}</Text>

          <Text style={styles.label}>Mezzo</Text>
          <View style={styles.row}>
            <Pressable
              testID="manual-veh-amb"
              onPress={() => setVehicle("ambulanza")}
              style={[styles.chip, vehicle === "ambulanza" && styles.chipActive]}
            >
              <Ionicons name="medical" size={16} color={vehicle === "ambulanza" ? COLORS.white : COLORS.brand} />
              <Text style={[styles.chipText, vehicle === "ambulanza" && { color: COLORS.white }]}>Ambulanza</Text>
            </Pressable>
            <Pressable
              testID="manual-veh-fur"
              onPress={() => setVehicle("furgone")}
              style={[styles.chip, vehicle === "furgone" && styles.chipActive]}
            >
              <Ionicons name="accessibility" size={16} color={vehicle === "furgone" ? COLORS.white : COLORS.brand} />
              <Text style={[styles.chipText, vehicle === "furgone" && { color: COLORS.white }]}>Furgone</Text>
            </Pressable>
          </View>

          <Text style={styles.label}>Orario</Text>
          <View style={styles.timeGrid}>
            {TIME_OPTIONS.map((tm) => (
              <Pressable
                key={tm}
                testID={`manual-time-${tm}`}
                onPress={() => setTime(tm)}
                style={[styles.timeChip, time === tm && styles.chipActive]}
              >
                <Text style={[styles.timeChipText, time === tm && { color: COLORS.white }]}>{tm}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Nome prenotante*</Text>
          <TextInput value={requesterName} onChangeText={setRequesterName} style={styles.input} testID="manual-name" />
          <Text style={styles.label}>Telefono</Text>
          <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" style={styles.input} testID="manual-phone" />
          <Text style={styles.label}>Email (per eventuale annullamento)</Text>
          <TextInput value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" style={styles.input} testID="manual-email" />
          <Text style={styles.label}>Paziente</Text>
          <TextInput value={patientName} onChangeText={setPatientName} style={styles.input} testID="manual-patient" />
          <Text style={styles.label}>Indirizzo</Text>
          <TextInput value={address} onChangeText={setAddress} style={styles.input} testID="manual-address" />
          <Text style={styles.label}>Note</Text>
          <TextInput value={notes} onChangeText={setNotes} multiline style={[styles.input, { height: 70, textAlignVertical: "top" }]} testID="manual-notes" />

          <View style={styles.actions}>
            <Pressable onPress={onClose} style={[styles.btn, styles.btnSec]}>
              <Text style={styles.btnSecText}>Annulla</Text>
            </Pressable>
            <Pressable onPress={save} disabled={saving} style={[styles.btn, styles.btnPri, saving && { opacity: 0.5 }]} testID="manual-save">
              {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.btnPriText}>Registra</Text>}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  card: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg, padding: SPACING.lg, paddingBottom: SPACING.xxl },
  title: { fontSize: 18, fontWeight: "800", color: COLORS.navy, textAlign: "center" },
  subtitle: { fontSize: 12, color: COLORS.onSurfaceMuted, textAlign: "center", marginBottom: SPACING.md },
  label: { fontSize: 12, color: COLORS.onSurfaceMuted, marginTop: SPACING.sm, marginBottom: 6, fontWeight: "600" },
  row: { flexDirection: "row", gap: SPACING.sm },
  chip: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceSecondary, borderWidth: 1, borderColor: COLORS.border },
  chipActive: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  chipText: { fontWeight: "700", color: COLORS.navy, fontSize: 13 },
  timeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  timeChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: RADIUS.pill, backgroundColor: COLORS.surfaceSecondary, borderWidth: 1, borderColor: COLORS.border },
  timeChipText: { fontWeight: "700", color: COLORS.navy, fontSize: 13 },
  input: { backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.sm, paddingHorizontal: SPACING.md, paddingVertical: 12, fontSize: 15, color: COLORS.onSurface, borderWidth: 1, borderColor: COLORS.border },
  actions: { flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.lg },
  btn: { flex: 1, paddingVertical: 14, borderRadius: RADIUS.md, alignItems: "center" },
  btnPri: { backgroundColor: COLORS.brand },
  btnPriText: { color: COLORS.white, fontWeight: "700" },
  btnSec: { backgroundColor: COLORS.surfaceTertiary },
  btnSecText: { color: COLORS.navy, fontWeight: "600" },
});
