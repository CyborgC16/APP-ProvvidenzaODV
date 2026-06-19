import { useState } from "react";
import { Pressable, Text, View, Platform, StyleSheet, Modal } from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";

import { COLORS, RADIUS, SPACING } from "@/src/theme";

type Props = {
  value: string; // YYYY-MM-DD
  onChange: (v: string) => void;
  label?: string;
  testID?: string;
};

function isoToDate(iso: string): Date {
  if (!iso) return new Date();
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function dateToIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatIt(iso: string): string {
  if (!iso) return "Seleziona data";
  try {
    return isoToDate(iso).toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
  } catch {
    return iso;
  }
}

export default function DatePickerField({ value, onChange, label, testID }: Props) {
  const [show, setShow] = useState(false);

  const handleChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS !== "ios") setShow(false);
    if (selected) onChange(dateToIso(selected));
  };

  // Web fallback: native HTML date input via TextInput type
  if (Platform.OS === "web") {
    return (
      <View style={{ marginBottom: SPACING.sm }}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        {/* @ts-ignore web input via View+input shim using Pressable */}
        <input
          type="date"
          value={value}
          onChange={(e: any) => onChange(e.target.value)}
          data-testid={testID || "date-picker"}
          style={{
            backgroundColor: COLORS.surfaceSecondary,
            borderRadius: RADIUS.sm,
            padding: 12,
            fontSize: 15,
            color: COLORS.onSurface,
            border: `1px solid ${COLORS.border}`,
            width: "100%",
            boxSizing: "border-box",
          }}
        />
      </View>
    );
  }

  return (
    <View style={{ marginBottom: SPACING.sm }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable testID={testID || "date-picker"} onPress={() => setShow(true)} style={styles.btn}>
        <Ionicons name="calendar" size={18} color={COLORS.brand} />
        <Text style={styles.btnText}>{formatIt(value)}</Text>
      </Pressable>
      {Platform.OS === "ios" ? (
        <Modal visible={show} transparent animationType="slide" onRequestClose={() => setShow(false)}>
          <View style={styles.modal}>
            <View style={styles.modalCard}>
              <DateTimePicker
                value={isoToDate(value)}
                mode="date"
                display="inline"
                onChange={handleChange}
                themeVariant="light"
              />
              <Pressable onPress={() => setShow(false)} style={styles.doneBtn}>
                <Text style={styles.doneText}>Fatto</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      ) : (
        show && <DateTimePicker value={isoToDate(value)} mode="date" display="default" onChange={handleChange} />
      )}
    </View>
  );
}

export function TimePickerField({ value, onChange, label, testID }: { value: string; onChange: (v: string) => void; label?: string; testID?: string }) {
  const [show, setShow] = useState(false);

  const parseTime = (s: string) => {
    const [h, m] = (s || "08:00").split(":").map(Number);
    const d = new Date();
    d.setHours(h || 0);
    d.setMinutes(m || 0);
    return d;
  };

  const onPick = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS !== "ios") setShow(false);
    if (selected) {
      const h = String(selected.getHours()).padStart(2, "0");
      const m = String(selected.getMinutes()).padStart(2, "0");
      onChange(`${h}:${m}`);
    }
  };

  if (Platform.OS === "web") {
    return (
      <View style={{ marginBottom: SPACING.sm }}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        {/* @ts-ignore */}
        <input
          type="time"
          value={value}
          onChange={(e: any) => onChange(e.target.value)}
          data-testid={testID || "time-picker"}
          style={{
            backgroundColor: COLORS.surfaceSecondary,
            borderRadius: RADIUS.sm,
            padding: 12,
            fontSize: 15,
            color: COLORS.onSurface,
            border: `1px solid ${COLORS.border}`,
            width: "100%",
            boxSizing: "border-box",
          }}
        />
      </View>
    );
  }

  return (
    <View style={{ marginBottom: SPACING.sm }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable testID={testID || "time-picker"} onPress={() => setShow(true)} style={styles.btn}>
        <Ionicons name="time" size={18} color={COLORS.brand} />
        <Text style={styles.btnText}>{value || "Seleziona orario"}</Text>
      </Pressable>
      {Platform.OS === "ios" ? (
        <Modal visible={show} transparent animationType="slide" onRequestClose={() => setShow(false)}>
          <View style={styles.modal}>
            <View style={styles.modalCard}>
              <DateTimePicker value={parseTime(value)} mode="time" display="spinner" onChange={onPick} themeVariant="light" />
              <Pressable onPress={() => setShow(false)} style={styles.doneBtn}>
                <Text style={styles.doneText}>Fatto</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      ) : (
        show && <DateTimePicker value={parseTime(value)} mode="time" display="default" onChange={onPick} is24Hour />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, color: COLORS.onSurfaceMuted, marginBottom: 6, fontWeight: "600" },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  btnText: { fontSize: 15, color: COLORS.onSurface, textTransform: "capitalize", flex: 1 },
  modal: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: COLORS.surface, padding: SPACING.lg, borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg },
  doneBtn: { backgroundColor: COLORS.brand, paddingVertical: 12, borderRadius: RADIUS.md, alignItems: "center", marginTop: SPACING.sm },
  doneText: { color: COLORS.white, fontWeight: "700", fontSize: 15 },
});
