import { useCallback, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS, SPACING, RADIUS, SHADOW, LOGO_URL } from "@/src/theme";
import { useAuth } from "@/src/auth";
import { api, Booking, Slot } from "@/src/api";

export default function Account() {
  const { user, loading, logout, login } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={COLORS.brand} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  if (!user) return <LoginView onLogin={login} />;

  if (user.role === "master" || user.role === "admin") {
    return <AdminDashboard onLogout={logout} role={user.role} onOpenUsers={() => router.push("/admin/users")} onNewSlot={() => router.push("/admin/slot-new")} fullName={user.full_name} />;
  }

  return <CivilServiceDashboard onLogout={logout} fullName={user.full_name} />;
}

// ===== LOGIN =====
function LoginView({ onLogin }: { onLogin: (u: string, p: string) => Promise<any> }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setErr(null);
    try {
      await onLogin(username.trim(), password);
    } catch (e: any) {
      setErr(e.message || "Login fallito");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} testID="login-screen">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.loginScroll} keyboardShouldPersistTaps="handled">
          <Image source={{ uri: LOGO_URL }} style={styles.loginLogo} contentFit="contain" />
          <Text style={styles.loginTitle}>Area Riservata</Text>
          <Text style={styles.loginSubtitle}>Accesso volontari e servizio civile</Text>

          {err ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={COLORS.white} />
              <Text style={styles.errorText}>{err}</Text>
            </View>
          ) : null}

          <Text style={styles.fieldLabel}>Username</Text>
          <TextInput
            testID="login-username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            style={styles.input}
            placeholder="username"
            placeholderTextColor={COLORS.onSurfaceMuted}
          />
          <Text style={styles.fieldLabel}>Password</Text>
          <TextInput
            testID="login-password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={COLORS.onSurfaceMuted}
          />
          <Pressable
            testID="login-submit-button"
            onPress={handleLogin}
            disabled={loading || !username || !password}
            style={[styles.primaryBtn, (!username || !password) && { opacity: 0.5 }]}
          >
            {loading ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.primaryBtnText}>Accedi</Text>}
          </Pressable>

          <Text style={styles.loginNote}>
            Le credenziali sono fornite dagli amministratori. La registrazione autonoma non è
            consentita.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ===== ADMIN DASHBOARD =====
function AdminDashboard({
  onLogout,
  role,
  onOpenUsers,
  onNewSlot,
  fullName,
}: {
  onLogout: () => Promise<void>;
  role: string;
  onOpenUsers: () => void;
  onNewSlot: () => void;
  fullName: string;
}) {
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, b] = await Promise.all([
        api.listSlots({ date_from: date, date_to: date }),
        api.listBookings(date),
      ]);
      setSlots(s);
      setBookings(b);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const dateOptions = nextNDays(14);

  const deleteSlot = async (id: string) => {
    await api.deleteSlot(id);
    load();
  };
  const deleteBooking = async (id: string) => {
    await api.deleteBooking(id);
    load();
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]} testID="admin-dashboard">
      <View style={styles.dashHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.dashTitle}>Ciao, {fullName}</Text>
          <Text style={styles.dashSubtitle}>
            Ruolo: <Text style={{ fontWeight: "700", color: COLORS.brand }}>{role.toUpperCase()}</Text>
          </Text>
        </View>
        <Pressable onPress={onOpenUsers} hitSlop={10} testID="open-users-btn" style={styles.iconBtn}>
          <Ionicons name="people" size={22} color={COLORS.navy} />
        </Pressable>
        <Pressable onPress={onLogout} hitSlop={10} testID="logout-btn" style={styles.iconBtn}>
          <Ionicons name="log-out-outline" size={22} color={COLORS.navy} />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.dateStripContent}
        style={styles.dateStrip}
      >
        {dateOptions.map((d) => {
          const sel = d.iso === date;
          return (
            <Pressable
              key={d.iso}
              onPress={() => setDate(d.iso)}
              testID={`date-${d.iso}`}
              style={[styles.dateChip, sel && styles.dateChipSel]}
            >
              <Text style={[styles.dateChipDay, sel && { color: COLORS.white }]}>{d.day}</Text>
              <Text style={[styles.dateChipDate, sel && { color: COLORS.white }]}>{d.dn}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.dashBody}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.brand} />}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Slot ({slots.length})</Text>
        </View>
        {slots.length === 0 ? (
          <Text style={styles.emptyText}>Nessuno slot per questa data. Aggiungine uno dal pulsante &quot;+&quot;.</Text>
        ) : (
          slots.map((s) => (
            <View key={s.id} style={styles.itemCard} testID={`admin-slot-${s.id}`}>
              <View style={[styles.itemIcon, { backgroundColor: COLORS.brandLight }]}>
                <Ionicons
                  name={s.vehicle_type === "ambulanza" ? "medical" : "accessibility"}
                  size={20}
                  color={COLORS.brand}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>
                  {s.time} · {s.vehicle_type === "ambulanza" ? "Ambulanza" : "Furgone"}
                </Text>
                <Text style={styles.itemSub}>
                  Prenotati {s.booked_count}/{s.capacity}
                  {s.notes ? ` · ${s.notes}` : ""}
                </Text>
              </View>
              <Pressable onPress={() => deleteSlot(s.id)} testID={`del-slot-${s.id}`} hitSlop={8}>
                <Ionicons name="trash-outline" size={20} color={COLORS.error} />
              </Pressable>
            </View>
          ))
        )}

        <View style={[styles.sectionHeader, { marginTop: SPACING.xl }]}>
          <Text style={styles.sectionTitle}>Prenotazioni ({bookings.length})</Text>
        </View>
        {bookings.length === 0 ? (
          <Text style={styles.emptyText}>Nessuna prenotazione per questa data.</Text>
        ) : (
          bookings.map((b) => (
            <View key={b.id} style={styles.bookingCard} testID={`admin-booking-${b.id}`}>
              <View style={styles.bookingHeader}>
                <Text style={styles.bookingTime}>
                  {b.slot_time} · {b.vehicle_type === "ambulanza" ? "Ambulanza" : "Furgone"}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: COLORS.brandLight }]}>
                  <Text style={[styles.statusBadgeText, { color: COLORS.brand }]}>{b.status}</Text>
                </View>
              </View>
              <Text style={styles.bookingName}>
                Paziente: {b.patient_name} {b.patient_surname}
              </Text>
              <Text style={styles.bookingMeta}>{b.address}</Text>
              <Text style={styles.bookingMeta}>
                Tel: {b.phone} · Email: {b.email}
              </Text>
              <Text style={styles.bookingMeta}>
                Piano {b.floor} · Ascensore: {b.has_elevator ? "Sì" : "No"} · {b.patient_weight_class}
              </Text>
              {b.notes ? <Text style={styles.bookingMeta}>Note: {b.notes}</Text> : null}
              <Pressable
                onPress={() => deleteBooking(b.id)}
                testID={`del-booking-${b.id}`}
                style={styles.delLinkBtn}
              >
                <Ionicons name="trash-outline" size={16} color={COLORS.error} />
                <Text style={styles.delLinkText}>Elimina prenotazione</Text>
              </Pressable>
            </View>
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <Pressable onPress={onNewSlot} testID="new-slot-fab" style={styles.fab}>
        <Ionicons name="add" size={28} color={COLORS.white} />
      </Pressable>
    </SafeAreaView>
  );
}

// ===== CIVIL SERVICE DASHBOARD =====
function CivilServiceDashboard({ onLogout, fullName }: { onLogout: () => Promise<void>; fullName: string }) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await api.mySlots();
      setSlots(s);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const grouped = slots.reduce<Record<string, Slot[]>>((acc, s) => {
    (acc[s.date] ||= []).push(s);
    return acc;
  }, {});

  return (
    <SafeAreaView style={styles.safe} edges={["top"]} testID="civil-service-dashboard">
      <View style={styles.dashHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.dashTitle}>Ciao, {fullName}</Text>
          <Text style={styles.dashSubtitle}>I tuoi turni di servizio civile</Text>
        </View>
        <Pressable onPress={onLogout} hitSlop={10} testID="logout-btn" style={styles.iconBtn}>
          <Ionicons name="log-out-outline" size={22} color={COLORS.navy} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.dashBody}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.brand} />}
      >
        {Object.keys(grouped).length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="calendar-outline" size={48} color={COLORS.onSurfaceMuted} />
            <Text style={styles.emptyText}>Nessun turno assegnato per il momento.</Text>
          </View>
        ) : (
          Object.entries(grouped).map(([date, group]) => (
            <View key={date} style={{ marginBottom: SPACING.lg }}>
              <Text style={styles.dateGroupLabel}>{formatLong(date)}</Text>
              {group.map((s) => (
                <View key={s.id} style={styles.itemCard} testID={`civic-shift-${s.id}`}>
                  <View style={[styles.itemIcon, { backgroundColor: COLORS.brandLight }]}>
                    <Ionicons name="time" size={20} color={COLORS.brand} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>
                      {s.time} · {s.vehicle_type === "ambulanza" ? "Ambulanza" : "Furgone"}
                    </Text>
                    {s.notes ? <Text style={styles.itemSub}>{s.notes}</Text> : null}
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

function nextNDays(n: number) {
  const result: { iso: string; day: string; dn: string }[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const day = d.toLocaleDateString("it-IT", { weekday: "short" }).slice(0, 3).toUpperCase();
    const dn = String(d.getDate());
    result.push({ iso, day, dn });
  }
  return result;
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
  loginScroll: { padding: SPACING.xl, alignItems: "stretch", flexGrow: 1, justifyContent: "center" },
  loginLogo: { width: 120, height: 120, alignSelf: "center", marginBottom: SPACING.lg },
  loginTitle: { fontSize: 24, fontWeight: "700", color: COLORS.navy, textAlign: "center" },
  loginSubtitle: { fontSize: 13, color: COLORS.onSurfaceMuted, textAlign: "center", marginBottom: SPACING.xl },
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
    marginBottom: SPACING.md,
  },
  primaryBtn: {
    backgroundColor: COLORS.brand,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: SPACING.sm,
  },
  primaryBtnText: { color: COLORS.white, fontWeight: "700", fontSize: 15 },
  loginNote: { fontSize: 12, color: COLORS.onSurfaceMuted, textAlign: "center", marginTop: SPACING.xl, lineHeight: 18 },
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
  dashHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.lg,
    gap: SPACING.sm,
    backgroundColor: COLORS.surfaceSecondary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dashTitle: { fontSize: 17, fontWeight: "700", color: COLORS.navy },
  dashSubtitle: { fontSize: 12, color: COLORS.onSurfaceMuted, marginTop: 2 },
  iconBtn: { padding: 8, borderRadius: RADIUS.sm, backgroundColor: COLORS.surfaceTertiary },
  dateStrip: { backgroundColor: COLORS.surfaceSecondary, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  dateStripContent: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, gap: SPACING.sm },
  dateChip: {
    width: 54,
    height: 64,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  dateChipSel: { backgroundColor: COLORS.brand },
  dateChipDay: { fontSize: 11, color: COLORS.onSurfaceMuted, fontWeight: "700" },
  dateChipDate: { fontSize: 18, color: COLORS.navy, fontWeight: "800", marginTop: 2 },
  dashBody: { padding: SPACING.lg, paddingBottom: SPACING.xxxl + 60 },
  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: SPACING.md },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: COLORS.navy },
  emptyText: { fontSize: 14, color: COLORS.onSurfaceMuted, textAlign: "center", marginVertical: SPACING.md },
  emptyBox: { alignItems: "center", padding: SPACING.xxl, gap: SPACING.md },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    ...SHADOW.card,
  },
  itemIcon: { width: 40, height: 40, borderRadius: RADIUS.pill, alignItems: "center", justifyContent: "center" },
  itemTitle: { fontSize: 14, fontWeight: "700", color: COLORS.navy },
  itemSub: { fontSize: 12, color: COLORS.onSurfaceMuted, marginTop: 2 },
  bookingCard: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOW.card,
  },
  bookingHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: SPACING.xs },
  bookingTime: { fontSize: 15, fontWeight: "700", color: COLORS.navy },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.pill },
  statusBadgeText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  bookingName: { fontSize: 13, fontWeight: "600", color: COLORS.navy, marginTop: 2 },
  bookingMeta: { fontSize: 12, color: COLORS.onSurfaceMuted, marginTop: 2 },
  delLinkBtn: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: SPACING.sm },
  delLinkText: { fontSize: 12, color: COLORS.error, fontWeight: "600" },
  fab: {
    position: "absolute",
    bottom: SPACING.xl,
    right: SPACING.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.brand,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW.fab,
  },
  dateGroupLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.navy,
    marginBottom: SPACING.sm,
    textTransform: "capitalize",
  },
});
