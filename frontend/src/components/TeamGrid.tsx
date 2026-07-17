import React, { useEffect, useMemo, useRef, useState } from "react";
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
  Animated,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";

import { COLORS, SPACING, RADIUS, SHADOW } from "@/src/theme";
import { api, TeamMember, UserPublic } from "@/src/api";
import { useAuth } from "@/src/auth";
import DatePickerField from "@/src/components/DatePickerField";

type Props = {
  team: TeamMember[];
  currentUser: UserPublic | null;
  onReload: () => void;
};

function isBirthday(birthDate?: string | null): boolean {
  if (!birthDate) return false;
  const now = new Date();
  const bd = new Date(birthDate);
  return now.getMonth() === bd.getMonth() && now.getDate() === bd.getDate();
}


const PRESENCE_COLOR: Record<string, string> = {
  disponibile: "#22C55E",
  impegnato: "#F97316",
  non_disponibile: "#EF4444",
  offline: "#94A3B8",
};

const PRESENCE_LABEL: Record<string, string> = {
  disponibile: "Disponibile",
  impegnato: "In servizio",
  non_disponibile: "Non disponibile",
  offline: "Offline",
};

function PresenceAvatar({ member }: { member: TeamMember }) {
  const scale = useRef(new Animated.Value(1)).current;
  const status = member.presence?.status || "offline";
  useEffect(() => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.07, duration: 220, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();
  }, [status, scale]);
  return (
    <Animated.View style={[styles.presenceRing, { borderColor: PRESENCE_COLOR[status], transform: [{ scale }] }]}>
      {member.photo_b64 ? (
        <Image source={{ uri: member.photo_b64 }} style={styles.photo} contentFit="cover" />
      ) : (
        <View style={[styles.photo, styles.photoEmpty]}>
          <Text style={styles.photoInitial}>{member.full_name.charAt(0)}</Text>
        </View>
      )}
    </Animated.View>
  );
}

function formatItalianDate(iso?: string | null): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("it-IT", { day: "2-digit", month: "long", year: "numeric" });
  } catch {
    return iso;
  }
}

export default function TeamGrid({ team, currentUser, onReload }: Props) {
  const { refresh } = useAuth();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<TeamMember | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    bio: "",
    role_title: "",
    join_date: "",
    birth_date: "",
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return team;
    return team.filter((m) =>
      m.full_name.toLowerCase().includes(q) ||
      (m.role_title || "").toLowerCase().includes(q),
    );
  }, [team, search]);

  const canEdit = (m: TeamMember): boolean => {
    if (!currentUser) return false;
    if (currentUser.role === "master") return true;
    return currentUser.id === m.id;
  };

  const openBio = (m: TeamMember) => {
    setSelected(m);
    setEditing(false);
    setForm({
      bio: m.bio || "",
      role_title: m.role_title || "",
      join_date: m.join_date || "",
      birth_date: m.birth_date || "",
    });
  };

  const startEdit = () => setEditing(true);

  const saveBio = async () => {
    if (!selected || !currentUser) return;
    setSaving(true);
    try {
      const payload = {
        bio: form.bio,
        role_title: form.role_title,
        join_date: form.join_date,
        birth_date: form.birth_date,
      };
      if (currentUser.id === selected.id) {
        await api.updateProfile(payload);
        // keep the logged-in user's own data in sync
        if (typeof refresh === "function") {
          await refresh();
        }
      } else if (currentUser.role === "master") {
        await api.adminEditBio(selected.id, payload);
      }
      setEditing(false);
      setSelected(null);
      if (typeof onReload === "function") {
        onReload();
      }
    } catch (e: any) {
      Alert.alert("Errore", (e && e.message) || "Impossibile salvare");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View>
      {team.length > 4 ? (
        <View style={styles.searchBar} testID="team-search-bar">
          <Ionicons name="search" size={18} color={COLORS.onSurfaceMuted} />
          <TextInput
            testID="team-search-input"
            placeholder="Cerca..."
            placeholderTextColor={COLORS.onSurfaceMuted}
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
          />
          {search ? (
            <Pressable onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color={COLORS.onSurfaceMuted} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View style={styles.grid}>
        {filtered.map((m) => {
          const birthday = isBirthday(m.birth_date);
          return (
            <Pressable
              key={m.id}
              style={styles.photoCard}
              onPress={() => openBio(m)}
              testID={`team-${m.id}`}
            >
              <View>
                <PresenceAvatar member={m} />
                {birthday ? (
                  <View style={styles.birthdayBadge}>
                    <Text style={styles.birthdayEmoji}>🎂</Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.photoName} numberOfLines={1}>
                {m.full_name}
              </Text>
              {m.role_title ? (
                <Text style={styles.photoRole} numberOfLines={1}>
                  {m.role_title}
                </Text>
              ) : null}
              <Text style={[styles.presenceLabel, { color: PRESENCE_COLOR[m.presence?.status || "offline"] }]}>
                {PRESENCE_LABEL[m.presence?.status || "offline"]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {filtered.length === 0 && team.length > 0 ? (
        <Text style={styles.empty}>Nessun risultato per &quot;{search}&quot;</Text>
      ) : null}

      {/* Bio Modal */}
      <Modal
        visible={!!selected}
        animationType="slide"
        transparent
        onRequestClose={() => setSelected(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalWrap}
        >
          <View style={styles.modalCard} testID="bio-modal">
            <ScrollView showsVerticalScrollIndicator={false}>
              {selected ? (
                <>
                  <View style={styles.modalHeader}>
                    {selected.photo_b64 ? (
                      <Image source={{ uri: selected.photo_b64 }} style={styles.modalAvatar} contentFit="cover" />
                    ) : (
                      <View style={[styles.modalAvatar, styles.photoEmpty]}>
                        <Text style={{ fontSize: 32, color: COLORS.cream, fontWeight: "800" }}>
                          {selected.full_name.charAt(0)}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.modalName}>{selected.full_name}</Text>
                    {isBirthday(selected.birth_date) ? (
                      <View style={styles.birthdayPill}>
                        <Text style={{ fontSize: 14 }}>🎂 Buon compleanno!</Text>
                      </View>
                    ) : null}
                  </View>

                  {editing ? (
                    <View>
                      <Text style={styles.fieldLabel}>🎯 Ruolo / Qualifica</Text>
                      <TextInput
                        testID="bio-role-title"
                        value={form.role_title}
                        onChangeText={(v) => setForm((p) => ({ ...p, role_title: v }))}
                        placeholder="Es. Soccorritore, Autista, Coordinatore"
                        style={styles.input}
                      />
                      <Text style={styles.fieldLabel}>📅 Data di ingresso in associazione</Text>
                      <DatePickerField
                        value={form.join_date}
                        onChange={(v) => setForm((p) => ({ ...p, join_date: v }))}
                        placeholder="Seleziona data"
                        maximumDate={new Date()}
                      />
                      <Text style={styles.fieldLabel}>🎂 Data di nascita</Text>
                      <DatePickerField
                        value={form.birth_date}
                        onChange={(v) => setForm((p) => ({ ...p, birth_date: v }))}
                        placeholder="Seleziona data"
                        maximumDate={new Date()}
                      />
                      <Text style={styles.fieldLabel}>✍️ Bio</Text>
                      <TextInput
                        testID="bio-text"
                        value={form.bio}
                        onChangeText={(v) => setForm((p) => ({ ...p, bio: v }))}
                        placeholder="Racconta qualcosa di te 💪 (formazione, passioni, motivazione...)"
                        style={[styles.input, { height: 120, textAlignVertical: "top" }]}
                        multiline
                      />
                      <View style={{ flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.md }}>
                        <Pressable onPress={() => setEditing(false)} style={[styles.btn, styles.btnSec]}>
                          <Text style={styles.btnSecText}>Annulla</Text>
                        </Pressable>
                        <Pressable
                          onPress={saveBio}
                          disabled={saving}
                          style={[styles.btn, styles.btnPri]}
                          testID="bio-save"
                        >
                          {saving ? (
                            <ActivityIndicator color={COLORS.white} />
                          ) : (
                            <Text style={styles.btnPriText}>Salva</Text>
                          )}
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <View>
                      {selected.role_title ? (
                        <Text style={styles.viewLine}>🎯 {selected.role_title}</Text>
                      ) : null}
                      {selected.join_date ? (
                        <Text style={styles.viewLine}>
                          📅 In associazione dal {formatItalianDate(selected.join_date)}
                        </Text>
                      ) : null}
                      {selected.birth_date ? (
                        <Text style={styles.viewLine}>
                          🎂 Nato il {formatItalianDate(selected.birth_date)}
                        </Text>
                      ) : null}
                      {selected.bio ? (
                        <Text style={styles.bioText}>{selected.bio}</Text>
                      ) : (
                        <Text style={styles.emptyBio}>
                          {canEdit(selected)
                            ? "Non hai ancora aggiunto una bio. Tocca ✏️ Modifica per iniziare!"
                            : "Nessuna bio disponibile."}
                        </Text>
                      )}

                      <View style={{ flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.lg }}>
                        <Pressable onPress={() => setSelected(null)} style={[styles.btn, styles.btnSec]}>
                          <Text style={styles.btnSecText}>Chiudi</Text>
                        </Pressable>
                        {canEdit(selected) ? (
                          <Pressable
                            onPress={startEdit}
                            style={[styles.btn, styles.btnPri]}
                            testID="bio-edit-btn"
                          >
                            <Ionicons name="create-outline" size={16} color={COLORS.white} />
                            <Text style={styles.btnPriText}> Modifica</Text>
                          </Pressable>
                        ) : null}
                      </View>
                    </View>
                  )}
                </>
              ) : null}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOW.card,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: COLORS.navy },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.md },
  photoCard: { width: "30%", alignItems: "center", marginBottom: SPACING.md },
  presenceRing: { width: 88, height: 88, borderRadius: 44, borderWidth: 4, padding: 3, ...SHADOW.card },
  photo: { width: "100%", height: "100%", borderRadius: 40 },
  photoEmpty: { backgroundColor: COLORS.navy, alignItems: "center", justifyContent: "center" },
  photoInitial: { fontSize: 28, fontWeight: "800", color: COLORS.cream },
  photoName: { fontSize: 12, color: COLORS.navy, marginTop: SPACING.sm, fontWeight: "700", textAlign: "center" },
  photoRole: { fontSize: 10, color: COLORS.brand, fontWeight: "600", textAlign: "center", marginTop: 1 },
  presenceLabel: { fontSize: 10, fontWeight: "800", textAlign: "center", marginTop: 2 },
  birthdayBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#F59E0B",
  },
  birthdayEmoji: { fontSize: 16 },
  empty: { textAlign: "center", color: COLORS.onSurfaceMuted, marginVertical: SPACING.lg, fontSize: 13 },
  modalWrap: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: SPACING.lg },
  modalCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.lg, maxHeight: "90%" },
  modalHeader: { alignItems: "center", marginBottom: SPACING.lg },
  modalAvatar: { width: 100, height: 100, borderRadius: 50, marginBottom: SPACING.sm },
  modalName: { fontSize: 20, fontWeight: "800", color: COLORS.navy, textAlign: "center" },
  birthdayPill: {
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    backgroundColor: "#FEF3C7",
    borderRadius: RADIUS.pill,
  },
  viewLine: { fontSize: 15, color: COLORS.navy, marginBottom: SPACING.sm, fontWeight: "600" },
  bioText: { fontSize: 14, color: COLORS.onSurface, lineHeight: 22, marginTop: SPACING.md },
  emptyBio: { fontSize: 13, color: COLORS.onSurfaceMuted, fontStyle: "italic", marginTop: SPACING.md, textAlign: "center" },
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
  btn: { flex: 1, paddingVertical: 12, borderRadius: RADIUS.pill, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  btnPri: { backgroundColor: COLORS.brand },
  btnPriText: { color: COLORS.white, fontWeight: "700", fontSize: 14 },
  btnSec: { backgroundColor: COLORS.surfaceTertiary },
  btnSecText: { color: COLORS.navy, fontWeight: "600", fontSize: 14 },
});
