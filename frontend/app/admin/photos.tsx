import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView, FlatList, Modal, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS, SPACING, RADIUS, SHADOW } from "@/src/theme";
import { api, GalleryPhoto, TeamMember } from "@/src/api";
import { pickImageBase64 } from "@/src/utils/picker";

export default function PhotoManager() {
  const router = useRouter();
  const [tab, setTab] = useState<"gallery" | "admin" | "sc">("gallery");
  return (
    <SafeAreaView style={styles.safe} testID="photo-manager-screen">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={COLORS.navy} />
        </Pressable>
        <Text style={styles.headerTitle}>Gestione Foto</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.tabsRow}>
        <TabChip label="Galleria Home" active={tab === "gallery"} onPress={() => setTab("gallery")} testID="tab-gallery" />
        <TabChip label="Volontari" active={tab === "admin"} onPress={() => setTab("admin")} testID="tab-vol" />
        <TabChip label="Servizio Civile" active={tab === "sc"} onPress={() => setTab("sc")} testID="tab-sc" />
      </View>

      {tab === "gallery" ? <GallerySection /> : <TeamSection role={tab === "admin" ? "admin" : "servizio_civile"} />}
    </SafeAreaView>
  );
}

function TabChip({ label, active, onPress, testID }: any) {
  return (
    <Pressable onPress={onPress} testID={testID} style={[styles.chip, active && styles.chipSel]}>
      <Text style={[styles.chipText, active && { color: COLORS.white }]}>{label}</Text>
    </Pressable>
  );
}

function GallerySection() {
  const [items, setItems] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [pending, setPending] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api.listGallery());
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const pick = async () => {
    const b64 = await pickImageBase64();
    if (b64) setPending(b64);
  };

  const upload = async () => {
    if (!pending) return;
    setUploading(true);
    try {
      await api.addPhoto(pending, caption || undefined);
      setPending(null);
      setCaption("");
      load();
    } finally {
      setUploading(false);
    }
  };

  const remove = async (id: string) => {
    await api.deletePhoto(id);
    load();
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.uploaderRow}>
        {pending ? (
          <>
            <Image source={{ uri: pending }} style={styles.preview} contentFit="cover" />
            <TextInput
              placeholder="Didascalia (opzionale)"
              placeholderTextColor={COLORS.onSurfaceMuted}
              value={caption}
              onChangeText={setCaption}
              style={[styles.input, { flex: 1 }]}
              testID="gallery-caption"
            />
            <Pressable onPress={upload} disabled={uploading} testID="gallery-upload" style={[styles.actionBtn, uploading && { opacity: 0.5 }]}>
              {uploading ? <ActivityIndicator color={COLORS.white} /> : <Ionicons name="cloud-upload" size={20} color={COLORS.white} />}
            </Pressable>
            <Pressable onPress={() => setPending(null)} style={styles.actionBtn2}>
              <Ionicons name="close" size={20} color={COLORS.error} />
            </Pressable>
          </>
        ) : (
          <Pressable onPress={pick} testID="gallery-pick" style={styles.pickBtn}>
            <Ionicons name="image" size={20} color={COLORS.brand} />
            <Text style={styles.pickText}>Carica nuova foto galleria</Text>
          </Pressable>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.brand} style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          numColumns={2}
          contentContainerStyle={{ padding: SPACING.lg }}
          columnWrapperStyle={{ gap: SPACING.md, marginBottom: SPACING.md }}
          renderItem={({ item }) => (
            <View style={styles.gridItem}>
              <Image source={{ uri: item.photo_b64 }} style={styles.gridImg} contentFit="cover" />
              {item.caption ? <Text style={styles.gridCap} numberOfLines={1}>{item.caption}</Text> : null}
              <Pressable onPress={() => remove(item.id)} style={styles.delBadge} testID={`del-photo-${item.id}`}>
                <Ionicons name="trash" size={14} color={COLORS.white} />
              </Pressable>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>Nessuna foto. Carica la prima!</Text>}
        />
      )}
    </View>
  );
}

function TeamSection({ role }: { role: "admin" | "servizio_civile" }) {
  const [items, setItems] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api.team(role));
    } finally {
      setLoading(false);
    }
  }, [role]);
  useEffect(() => {
    load();
  }, [load]);

  const setPhoto = async (id: string) => {
    const b64 = await pickImageBase64();
    if (!b64) return;
    setBusy(id);
    try {
      await api.adminUpdateUserPhoto(id, b64);
      load();
    } finally {
      setBusy(null);
    }
  };

  if (loading) return <ActivityIndicator color={COLORS.brand} style={{ marginTop: 30 }} />;
  if (items.length === 0)
    return (
      <Text style={styles.empty}>
        Nessun utente di questo ruolo. Creane uno da Gestione Utenti.
      </Text>
    );

  return (
    <ScrollView contentContainerStyle={{ padding: SPACING.lg }}>
      {items.map((m) => (
        <View key={m.id} style={styles.memberCard} testID={`team-${m.id}`}>
          {m.photo_b64 ? (
            <Image source={{ uri: m.photo_b64 }} style={styles.memberPhoto} contentFit="cover" />
          ) : (
            <View style={[styles.memberPhoto, styles.memberPhotoEmpty]}>
              <Text style={styles.memberInitial}>{m.full_name.charAt(0)}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.memberName}>{m.full_name}</Text>
            <Text style={styles.memberRole}>{role === "admin" ? "Volontario" : "Servizio Civile"}</Text>
          </View>
          <Pressable
            onPress={() => setPhoto(m.id)}
            disabled={busy === m.id}
            style={[styles.actionBtn, busy === m.id && { opacity: 0.5 }]}
            testID={`upload-${m.id}`}
          >
            {busy === m.id ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Ionicons name="camera" size={18} color={COLORS.white} />
            )}
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.surface },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surfaceSecondary },
  headerTitle: { fontSize: 17, fontWeight: "700", color: COLORS.navy },
  tabsRow: { flexDirection: "row", gap: SPACING.sm, padding: SPACING.md, backgroundColor: COLORS.surfaceSecondary, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  chip: { flex: 1, paddingVertical: 10, borderRadius: RADIUS.pill, backgroundColor: COLORS.surfaceTertiary, alignItems: "center" },
  chipSel: { backgroundColor: COLORS.brand },
  chipText: { fontWeight: "600", color: COLORS.navy, fontSize: 12 },
  uploaderRow: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, padding: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surfaceSecondary },
  preview: { width: 50, height: 50, borderRadius: RADIUS.sm },
  input: { backgroundColor: COLORS.surface, borderRadius: RADIUS.sm, paddingHorizontal: SPACING.md, paddingVertical: 10, fontSize: 14, borderWidth: 1, borderColor: COLORS.border },
  actionBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.brand, alignItems: "center", justifyContent: "center" },
  actionBtn2: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  pickBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: SPACING.sm, padding: SPACING.md, backgroundColor: COLORS.brandLight, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.brand, borderStyle: "dashed" },
  pickText: { fontSize: 14, color: COLORS.brand, fontWeight: "700" },
  gridItem: { flex: 1, aspectRatio: 1, borderRadius: RADIUS.md, overflow: "hidden", backgroundColor: COLORS.surfaceTertiary, position: "relative" },
  gridImg: { width: "100%", height: "100%" },
  gridCap: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 6, fontSize: 11, color: COLORS.white, backgroundColor: "rgba(0,0,0,0.4)" },
  delBadge: { position: "absolute", top: 6, right: 6, backgroundColor: COLORS.error, borderRadius: 999, padding: 6 },
  empty: { textAlign: "center", color: COLORS.onSurfaceMuted, marginTop: SPACING.xxl, paddingHorizontal: SPACING.lg },
  memberCard: { flexDirection: "row", alignItems: "center", gap: SPACING.md, padding: SPACING.md, backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.md, marginBottom: SPACING.sm, ...SHADOW.card },
  memberPhoto: { width: 56, height: 56, borderRadius: 28 },
  memberPhotoEmpty: { backgroundColor: COLORS.brandLight, alignItems: "center", justifyContent: "center" },
  memberInitial: { fontSize: 20, fontWeight: "800", color: COLORS.brand },
  memberName: { fontSize: 14, fontWeight: "700", color: COLORS.navy },
  memberRole: { fontSize: 12, color: COLORS.onSurfaceMuted, marginTop: 2 },
});
