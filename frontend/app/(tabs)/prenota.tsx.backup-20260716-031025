import { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS, SPACING, RADIUS, SHADOW } from "@/src/theme";
import { api, DayAvailability } from "@/src/api";

type Vehicle = "ambulanza" | "furgone";
type Weight = "normopeso" | "obeso";

const TIME_OPTIONS = ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00"];
const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"];


function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getTomorrowIso(): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + 1);
  return toLocalIsoDate(date);
}

function getMaxBookingIso(): string {
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const originalDay = today.getDate();
  const maxDate = new Date(today);
  maxDate.setDate(1);
  maxDate.setMonth(maxDate.getMonth() + 2);

  const lastDayOfTargetMonth = new Date(
    maxDate.getFullYear(),
    maxDate.getMonth() + 1,
    0,
  ).getDate();

  maxDate.setDate(Math.min(originalDay, lastDayOfTargetMonth));
  return toLocalIsoDate(maxDate);
}
export default function Prenota() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [availability, setAvailability] = useState<DayAvailability[]>([]);
  const [loadingAvail, setLoadingAvail] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const [requesterName, setRequesterName] = useState("");
  const [requesterSurname, setRequesterSurname] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientSurname, setPatientSurname] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [weight, setWeight] = useState<Weight>("normopeso");
  const [hasElevator, setHasElevator] = useState<boolean | null>(null);
  const [floor, setFloor] = useState("0");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);

  useEffect(() => {
    if (step !== 2 || !vehicle) return;
    setLoadingAvail(true);
    setError(null);
    api
      .availability(70, getTomorrowIso())
      .then((data) => {
        const maxBookingDate = getMaxBookingIso();
        setAvailability(data.filter((day) => day.date <= maxBookingDate));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoadingAvail(false));
  }, [step, vehicle]);

  const availableForVehicle = useMemo(() => {
    if (!vehicle) return [];
    return availability.filter((d) =>
      vehicle === "ambulanza" ? d.ambulanza_available > 0 : d.furgone_available > 0,
    );
  }, [availability, vehicle]);

  const remainingForSelected = useMemo(() => {
    if (!selectedDate || !vehicle) return 0;
    const d = availability.find((a) => a.date === selectedDate);
    if (!d) return 0;
    return vehicle === "ambulanza" ? d.ambulanza_available : d.furgone_available;
  }, [availability, selectedDate, vehicle]);

  const canSubmit =
    requesterName.trim() &&
    requesterSurname.trim() &&
    patientName.trim() &&
    patientSurname.trim() &&
    phone.trim() &&
    address.trim() &&
    hasElevator !== null &&
    selectedDate &&
    selectedTime;

  const submit = async () => {
    if (!selectedDate || !selectedTime || !vehicle) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.createBooking({
        date: selectedDate,
        time: selectedTime,
        requester_name: requesterName.trim(),
        requester_surname: requesterSurname.trim(),
        patient_name: patientName.trim(),
        patient_surname: patientSurname.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: address.trim(),
        vehicle_type: vehicle,
        patient_weight_class: weight,
        has_elevator: !!hasElevator,
        floor: parseInt(floor || "0", 10),
        notes: notes.trim() || undefined,
      });
      setBookingId(res.id);
      setSuccess(true);
    } catch (e: any) {
      setError(e.message || "Errore durante la prenotazione");
    } finally {
      setSubmitting(false);
    }
  };

  const resetAll = () => {
    setStep(1);
    setVehicle(null);
    setSelectedDate(null);
    setSelectedTime(null);
    setRequesterName("");
    setRequesterSurname("");
    setPatientName("");
    setPatientSurname("");
    setPhone("");
    setEmail("");
    setAddress("");
    setWeight("normopeso");
    setHasElevator(null);
    setFloor("0");
    setNotes("");
    setSuccess(false);
    setBookingId(null);
    setError(null);
  };

  if (success) {
    return (
      <SafeAreaView style={styles.safe} testID="booking-success-screen">
        <View style={styles.successBox}>
          <View style={styles.successIcon}>
            <Ionicons name="checkmark-circle" size={72} color={COLORS.success} />
          </View>
          <Text style={styles.successTitle}>Prenotazione Inviata!</Text>
          <Text style={styles.successBody}>
            Grazie per averci scelto. La sua richiesta Ã¨ stata inviata ai nostri volontari.{"\n\n"}
            <Text style={{ fontWeight: "700" }}>ID Prenotazione:</Text> {bookingId}
          </Text>
          <View style={styles.disclaimerBox}>
            <Ionicons name="information-circle" size={18} color={COLORS.brand} />
            <Text style={styles.disclaimerText}>
              Ci riserviamo, per ogni prenotazione ricevuta, di verificare l&apos;effettiva disponibilitÃ 
              del mezzo ed eventualmente di richiamarLa per confermare o meno il servizio.
            </Text>
          </View>
          <Pressable testID="new-booking-button" onPress={resetAll} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>Nuova Prenotazione</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.header}>
          {step > 1 ? (
            <Pressable onPress={() => setStep((s) => (s - 1) as any)} testID="back-button" hitSlop={10}>
              <Ionicons name="chevron-back" size={26} color={COLORS.navy} />
            </Pressable>
          ) : (
            <View style={{ width: 26 }} />
          )}
          <Text style={styles.headerTitle}>Prenota Trasporto</Text>
          <Text style={styles.stepBadge}>{step}/3</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {error ? (
            <View style={styles.errorBanner} testID="booking-error">
              <Ionicons name="alert-circle" size={18} color={COLORS.white} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {step === 1 && (
            <View testID="step-vehicle">
              <Text style={styles.sectionTitle}>Tipo di Mezzo</Text>
              <Text style={styles.sectionSubtitle}>Seleziona il servizio richiesto.</Text>
              <Pressable
                testID="vehicle-ambulanza"
                onPress={() => setVehicle("ambulanza")}
                style={[styles.vehicleCard, vehicle === "ambulanza" && styles.vehicleCardSel]}
              >
                <View style={[styles.iconBubble, { backgroundColor: COLORS.brandLight }]}>
                  <Ionicons name="medical" size={28} color={COLORS.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.vehicleTitle}>Ambulanza</Text>
                  <Text style={styles.vehicleDesc}>Trasporto sanitario, emodialisi e barellati.</Text>
                </View>
                {vehicle === "ambulanza" && <Ionicons name="checkmark-circle" size={24} color={COLORS.brand} />}
              </Pressable>
              <Pressable
                testID="vehicle-furgone"
                onPress={() => setVehicle("furgone")}
                style={[styles.vehicleCard, vehicle === "furgone" && styles.vehicleCardSel]}
              >
                <View style={[styles.iconBubble, { backgroundColor: COLORS.brandLight }]}>
                  <Ionicons name="accessibility" size={28} color={COLORS.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.vehicleTitle}>Trasporto Disabili</Text>
                  <Text style={styles.vehicleDesc}>Furgone con pedana per carrozzine.</Text>
                </View>
                {vehicle === "furgone" && <Ionicons name="checkmark-circle" size={24} color={COLORS.brand} />}
              </Pressable>
            </View>
          )}

          {step === 2 && (
            <View testID="step-slot">
              <Text style={styles.sectionTitle}>Scegli il Giorno</Text>
              <Text style={styles.sectionSubtitle}>
                Disponibili dal lunedÃ¬ al sabato, prenotazioni fino alle 16:00. Il numero indica i posti
                ancora liberi per il mezzo scelto.
              </Text>
              {loadingAvail ? (
                <ActivityIndicator color={COLORS.brand} style={{ marginTop: SPACING.xl }} />
              ) : availableForVehicle.length === 0 ? (
                <View style={styles.emptyBox}>
                  <Ionicons name="calendar-outline" size={36} color={COLORS.onSurfaceMuted} />
                  <Text style={styles.emptyText}>Nessuna disponibilitÃ  nei prossimi giorni.</Text>
                  <Text style={styles.emptySubtext}>Riprova piÃ¹ tardi o contattaci telefonicamente.</Text>
                </View>
              ) : (
                <>
                  <View style={styles.dayGrid}>
                    {availableForVehicle.map((d) => {
                      const sel = selectedDate === d.date;
                      const remaining = vehicle === "ambulanza" ? d.ambulanza_available : d.furgone_available;
                      return (
                        <Pressable
                          key={d.date}
                          testID={`day-${d.date}`}
                          onPress={() => {
                            setSelectedDate(d.date);
                            setSelectedTime(null);
                          }}
                          style={[styles.dayCard, sel && styles.dayCardSel]}
                        >
                          <Text style={[styles.dayCardWd, sel && { color: COLORS.white }]}>
                            {WEEKDAY_LABELS[d.weekday]}
                          </Text>
                          <Text style={[styles.dayCardDate, sel && { color: COLORS.white }]}>
                            {formatShortDate(d.date)}
                          </Text>
                          <View style={[styles.dayBadge, sel && { backgroundColor: "rgba(255,255,255,0.25)" }]}>
                            <Text style={[styles.dayBadgeText, sel && { color: COLORS.white }]}>
                              {remaining} liberi
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>

                  {selectedDate ? (
                    <View style={{ marginTop: SPACING.lg }}>
                      <Text style={styles.sectionTitle}>Scegli l&apos;Orario</Text>
                      <Text style={styles.sectionSubtitle}>
                        {formatDate(selectedDate)} Â· {remainingForSelected} posti disponibili
                      </Text>
                      <View style={styles.slotsGrid}>
                        {TIME_OPTIONS.map((tm) => {
                          const sel = selectedTime === tm;
                          return (
                            <Pressable
                              key={tm}
                              testID={`time-${tm}`}
                              onPress={() => setSelectedTime(tm)}
                              style={[styles.slotChip, sel && styles.slotChipSel]}
                            >
                              <Text style={[styles.slotChipText, sel && { color: COLORS.white }]}>{tm}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  ) : null}
                </>
              )}
            </View>
          )}

          {step === 3 && (
            <View testID="step-details">
              <Text style={styles.sectionTitle}>Dati Prenotante</Text>
              <Row>
                <Field label="Nome*" value={requesterName} onChange={setRequesterName} testID="input-requester-name" />
                <Field
                  label="Cognome*"
                  value={requesterSurname}
                  onChange={setRequesterSurname}
                  testID="input-requester-surname"
                />
              </Row>
              <Row>
                <Field label="Telefono*" value={phone} onChange={setPhone} keyboardType="phone-pad" testID="input-phone" />
                <Field
                  label="Email (facoltativa)"
                  value={email}
                  onChange={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  testID="input-email"
                />
              </Row>
              <View style={styles.inlineNote}>
                <Ionicons name="call" size={14} color={COLORS.brand} />
                <Text style={styles.inlineNoteText}>
                  Il telefono Ã¨ obbligatorio: potremmo richiamarLa per confermare la disponibilitÃ .
                </Text>
              </View>

              <Text style={[styles.sectionTitle, { marginTop: SPACING.xl }]}>Dati Paziente</Text>
              <Row>
                <Field label="Nome*" value={patientName} onChange={setPatientName} testID="input-patient-name" />
                <Field label="Cognome*" value={patientSurname} onChange={setPatientSurname} testID="input-patient-surname" />
              </Row>
              <Field label="Indirizzo*" value={address} onChange={setAddress} testID="input-address" />

              <Text style={styles.miniLabel}>Peso paziente</Text>
              <View style={styles.toggleRow}>
                <ToggleChip label="Normopeso" active={weight === "normopeso"} onPress={() => setWeight("normopeso")} testID="weight-normo" />
                <ToggleChip label="Obeso" active={weight === "obeso"} onPress={() => setWeight("obeso")} testID="weight-obeso" />
              </View>

              <Text style={styles.miniLabel}>Ascensore in casa</Text>
              <View style={styles.toggleRow}>
                <ToggleChip label="SÃ¬" active={hasElevator === true} onPress={() => setHasElevator(true)} testID="elevator-yes" />
                <ToggleChip label="No" active={hasElevator === false} onPress={() => setHasElevator(false)} testID="elevator-no" />
              </View>

              <Field label="Piano" value={floor} onChange={setFloor} keyboardType="numeric" testID="input-floor" />
              <Field label="Note (opzionale)" value={notes} onChange={setNotes} multiline testID="input-notes" />

              <View style={styles.disclaimerBox}>
                <Ionicons name="information-circle" size={18} color={COLORS.brand} />
                <Text style={styles.disclaimerText}>
                  Ci riserviamo, per ogni prenotazione ricevuta, di verificare l&apos;effettiva disponibilitÃ 
                  del mezzo ed eventualmente di richiamarLa per confermare o meno il servizio.
                </Text>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          {step < 3 ? (
            <Pressable
              testID="continue-button"
              disabled={(step === 1 && !vehicle) || (step === 2 && (!selectedDate || !selectedTime))}
              onPress={() => setStep((s) => (s + 1) as any)}
              style={[
                styles.primaryBtn,
                ((step === 1 && !vehicle) || (step === 2 && (!selectedDate || !selectedTime))) && styles.primaryBtnDisabled,
              ]}
            >
              <Text style={styles.primaryBtnText}>Continua</Text>
              <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
            </Pressable>
          ) : (
            <Pressable
              testID="confirm-booking-button"
              disabled={!canSubmit || submitting}
              onPress={submit}
              style={[styles.primaryBtn, (!canSubmit || submitting) && styles.primaryBtnDisabled]}
            >
              {submitting ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
                  <Text style={styles.primaryBtnText}>Conferma Prenotazione</Text>
                </>
              )}
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function formatDate(d: string) {
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("it-IT", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

function formatShortDate(d: string) {
  try {
    return new Date(d + "T00:00:00").toLocaleDateString("it-IT", { day: "numeric", month: "short" });
  } catch {
    return d;
  }
}

function Row({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: "row", gap: SPACING.md }}>{children}</View>;
}

function Field({
  label,
  value,
  onChange,
  keyboardType,
  autoCapitalize,
  multiline,
  testID,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  keyboardType?: any;
  autoCapitalize?: any;
  multiline?: boolean;
  testID?: string;
}) {
  return (
    <View style={{ flex: 1, marginBottom: SPACING.md }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        style={[styles.input, multiline && { height: 90, textAlignVertical: "top" }]}
        placeholderTextColor={COLORS.onSurfaceMuted}
      />
    </View>
  );
}

function ToggleChip({
  label,
  active,
  onPress,
  testID,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable testID={testID} onPress={onPress} style={[styles.toggleChip, active && styles.toggleChipActive]}>
      <Text style={[styles.toggleChipText, active && { color: COLORS.white }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surfaceSecondary,
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: COLORS.navy },
  stepBadge: { fontSize: 13, fontWeight: "600", color: COLORS.brand, width: 30, textAlign: "right" },
  scroll: { padding: SPACING.lg, paddingBottom: SPACING.xxxl + 60 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: COLORS.navy, marginBottom: SPACING.xs },
  sectionSubtitle: { fontSize: 13, color: COLORS.onSurfaceMuted, marginBottom: SPACING.lg },
  vehicleCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.lg,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    borderWidth: 2,
    borderColor: "transparent",
    ...SHADOW.card,
  },
  vehicleCardSel: { borderColor: COLORS.brand },
  iconBubble: { width: 52, height: 52, borderRadius: RADIUS.pill, alignItems: "center", justifyContent: "center" },
  vehicleTitle: { fontSize: 16, fontWeight: "700", color: COLORS.navy },
  vehicleDesc: { fontSize: 13, color: COLORS.onSurfaceMuted, marginTop: 2 },
  dateLabel: { fontSize: 14, fontWeight: "700", color: COLORS.navy, marginBottom: SPACING.sm, textTransform: "capitalize" },
  dayGrid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  dayCard: {
    width: "22%",
    minWidth: 76,
    flexGrow: 1,
    alignItems: "center",
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.card,
  },
  dayCardSel: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  dayCardWd: { fontSize: 12, fontWeight: "700", color: COLORS.onSurfaceMuted, textTransform: "uppercase" },
  dayCardDate: { fontSize: 15, fontWeight: "800", color: COLORS.navy, marginTop: 2, textTransform: "capitalize" },
  dayBadge: { marginTop: 6, backgroundColor: COLORS.brandLight, borderRadius: RADIUS.pill, paddingHorizontal: 8, paddingVertical: 2 },
  dayBadgeText: { fontSize: 10, fontWeight: "700", color: COLORS.brand },
  inlineNote: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: -SPACING.xs, marginBottom: SPACING.sm },
  inlineNoteText: { flex: 1, fontSize: 11, color: COLORS.onSurfaceMuted },
  disclaimerBox: {
    flexDirection: "row",
    gap: SPACING.sm,
    backgroundColor: COLORS.brandLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.lg,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.brand,
  },
  disclaimerText: { flex: 1, fontSize: 12, color: "#5B4636", lineHeight: 18 },
  slotsGrid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.sm },
  slotChip: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  slotChipSel: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  slotChipText: { fontWeight: "700", color: COLORS.navy, fontSize: 14 },
  emptyBox: { alignItems: "center", padding: SPACING.xl, gap: SPACING.sm },
  emptyText: { fontSize: 15, fontWeight: "600", color: COLORS.navy, textAlign: "center" },
  emptySubtext: { fontSize: 13, color: COLORS.onSurfaceMuted, textAlign: "center" },
  fieldLabel: { fontSize: 12, color: COLORS.onSurfaceMuted, marginBottom: 6, fontWeight: "600" },
  input: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.onSurface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  miniLabel: { fontSize: 12, color: COLORS.onSurfaceMuted, marginTop: SPACING.sm, marginBottom: 6, fontWeight: "600" },
  toggleRow: { flexDirection: "row", gap: SPACING.sm, marginBottom: SPACING.md },
  toggleChip: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.surfaceSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  toggleChipActive: { backgroundColor: COLORS.navy, borderColor: COLORS.navy },
  toggleChipText: { fontWeight: "600", color: COLORS.navy },
  footer: {
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  primaryBtn: {
    backgroundColor: COLORS.brand,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: SPACING.sm,
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: COLORS.white, fontWeight: "700", fontSize: 15 },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.error,
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  errorText: { color: COLORS.white, flex: 1, fontSize: 13 },
  successBox: { flex: 1, alignItems: "center", justifyContent: "center", padding: SPACING.xl, gap: SPACING.md },
  successIcon: { marginBottom: SPACING.md },
  successTitle: { fontSize: 22, fontWeight: "700", color: COLORS.navy, textAlign: "center" },
  successBody: { fontSize: 14, color: COLORS.onSurface, textAlign: "center", lineHeight: 22 },
});

