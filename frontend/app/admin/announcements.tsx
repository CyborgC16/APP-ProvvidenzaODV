import { useCallback, useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS, SPACING, RADIUS, SHADOW } from "@/src/theme";
import { api, Announcement } from "@/src/api";
import DatePickerField from "@/src/components/DatePickerField";

type Level = "info" | "warning" | "danger";

export default function AnnouncementsAdmin() {
  const router = useRouter();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    message: "",
    level: "warning" as Level,
    expires_at: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api.listAnnouncements());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    if (!form.title.trim() || !form.message.trim() || !form.expires_at) {
      Alert.alert("Attenzione", "Compila titolo, messaggio e scadenza");
      return;
    }
    setSaving(true);
    try {
      await api.createAnnouncement({
        title: form.title.trim(),
        message: form.message.trim(),
        level: form.level,
        expires_at: form.expires_at,
      });
      setShowCreate(false);
      setForm({ title: "", message: "", level: "warning", expires_at: "" });
      load();
    } catch (e: any) {
      Alert.alert("Errore", e.message || "Errore");
    } finally {
      setSaving(false);
    }
  };

  const remove = (a: Announcement) => {
    Alert.alert("Elimina avviso", `Eliminare "${a.title}"?`, [
      { text: "Annulla", style: "cancel" },
      {
        text: "Elimina",
        style: "destructive",
        onPress: async () => {
          await api.deleteAnnouncement(a.id);
          load();
        },
      },
    ]);
  };

  const levelColor = (level: string) => {
    if (level === "danger") return "#DC2626";
    if (level === "info") return "#2563EB";
    return "#F59E0B";
  };
  const levelLabel = (level: string) =>
    level === "danger" ? "URGENTE" : level === "info" ? "INFO" : "AVVISO";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]} testID="announcements-admin">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={COLORS.navy} />
        </Pressable>
        <Text style={styles.headerTitle}>Avvisi</Text>
        <Pressable
          onPress={() => setShowCreate(true)}
          style={styles.addBtn}
          testID="new-announcement-btn"
        >
          <Ionicons name="add" size={20} color={COLORS.white} />
          <Text style={styles.addBtnText}>Nuovo</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.md }}>
        {loading ? (
          <ActivityIndicator color={COLORS.brand} />
        ) : items.length === 0 ? (
          <Text style={styles.empty}>Nessun avviso attivo. Tocca &quot;Nuovo&quot; per crearne uno.</Text>
        ) : (
          items.map((a) => (
            <View key={a.id} style={[styles.card, { borderLeftColor: levelColor(a.level) }]} testID={`ann-${a.id}`}>
              <View style={styles.cardHeader}>
                <View style={[styles.chip, { backgroundColor: levelColor(a.level) }]}>
                  <Text style={styles.chipText}>{levelLabel(a.level)}</Text>
                </View>
                <Text style={styles.expires}>Fino al {new Date(a.expires_at).toLocaleDateString("it-IT")}</Text>
              </View>
              <Text style={styles.title}>{a.title}</Text>
              <Text style={styles.msg}>{a.message}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.meta}>
                  di {a.author_name} · {new Date(a.created_at).toLocaleDateString("it-IT")}
                </Text>
                <Pressable onPress={() => remove(a)} hitSlop={8} testID={`delete-ann-${a.id}`}>
                  <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal visible={showCreate} animationType="slide" transparent onRequestClose={() => setShowCreate(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalWrap}
        >
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Nuovo Avviso</Text>

              <Text style={styles.fieldLabel}>Livello</Text>
              <View style={styles.levelRow}>
                {(["info", "warning", "danger"] as Level[]).map((lv) => (
                  <Pressable
                    key={lv}
                    onPress={() => setForm((p) => ({ ...p, level: lv }))}
                    style={[
                      styles.levelChip,
                      { backgroundColor: form.level === lv ? levelColor(lv) : COLORS.surfaceTertiary },
                    ]}
                    testID={`level-${lv}`}
                  >
                    <Text style={{ color: form.level === lv ? COLORS.white : COLORS.navy, fontWeight: "700" }}>
                      {levelLabel(lv)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Titolo</Text>
              <TextInput
                testID="ann-title"
                value={form.title}
                onChangeText={(v) => setForm((p) => ({ ...p, title: v }))}
                placeholder="Es. Riunione volontari domenica"
                style={styles.input}
              />

              <Text style={styles.fieldLabel}>Messaggio</Text>
              <TextInput
                testID="ann-message"
                value={form.message}
                onChangeText={(v) => setForm((p) => ({ ...p, message: v }))}
                placeholder="Testo dettagliato dell'avviso..."
                multiline
                style={[styles.input, { height: 120, textAlignVertical: "top" }]}
              />

              <Text style={styles.fieldLabel}>Scadenza</Text>
              <DatePickerField
                value={form.expires_at}
                onChange={(v) => setForm((p) => ({ ...p, expires_at: v }))}
                placeholder="Seleziona data di scadenza"
                minimumDate={new Date()}
              />

              <Text style={styles.hint}>
                📧 L&apos;avviso verrà inviato via email a tutti gli utenti registrati che hanno attivato le
                notifiche email.
              </Text>

              <View style={{ flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.md }}>
                <Pressable onPress={() => setShowCreate(false)} style={[styles.btn, styles.btnSec]}>
                  <Text style={styles.btnSecText}>Annulla</Text>
                </Pressable>
                <Pressable onPress={create} disabled={saving} style={[styles.btn, styles.btnPri]} testID="save-ann">
                  {saving ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.btnPriText}>Pubblica</Text>}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.brand,
    paddingVertical: 8,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.pill,
  },
  addBtnText: { color: COLORS.white, fontWeight: "700", fontSize: 13 },
  empty: { textAlign: "center", color: COLORS.onSurfaceMuted, marginTop: SPACING.xl, fontSize: 13 },
  card: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.md,
    borderLeftWidth: 4,
    padding: SPACING.md,
    ...SHADOW.card,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: RADIUS.pill },
  chipText: { color: COLORS.white, fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  expires: { fontSize: 11, color: COLORS.onSurfaceMuted, fontWeight: "600" },
  title: { fontSize: 15, fontWeight: "800", color: COLORS.navy, marginBottom: 4 },
  msg: { fontSize: 13, color: COLORS.onSurface, lineHeight: 19 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: SPACING.sm },
  meta: { fontSize: 11, color: COLORS.onSurfaceMuted },
  modalWrap: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: SPACING.lg },
  modalCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.lg, maxHeight: "90%" },
  modalTitle: { fontSize: 18, fontWeight: "800", color: COLORS.navy, marginBottom: SPACING.md },
  fieldLabel: { fontSize: 13, fontWeight: "700", color: COLORS.navy, marginTop: SPACING.md, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.navy,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  levelRow: { flexDirection: "row", gap: SPACING.sm },
  levelChip: { flex: 1, paddingVertical: 10, borderRadius: RADIUS.pill, alignItems: "center" },
  hint: { fontSize: 12, color: COLORS.onSurfaceMuted, marginTop: SPACING.md, fontStyle: "italic", lineHeight: 17 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: RADIUS.pill, alignItems: "center", justifyContent: "center" },
  btnPri: { backgroundColor: COLORS.brand },
  btnPriText: { color: COLORS.white, fontWeight: "700", fontSize: 14 },
  btnSec: { backgroundColor: COLORS.surfaceTertiary },
  btnSecText: { color: COLORS.navy, fontWeight: "600", fontSize: 14 },
});
