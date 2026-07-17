import React, { useEffect, useState, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, Modal, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { COLORS, SPACING, RADIUS, SHADOW } from "@/src/theme";
import { api, Announcement } from "@/src/api";
import { useAuth } from "@/src/auth";

export default function AnnouncementsBanner() {
  const { user } = useAuth();
  const [items, setItems] = useState<Announcement[]>([]);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [selected, setSelected] = useState<Announcement | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setItems([]);
      return;
    }
    try {
      const [list, reads] = await Promise.all([
        api.listAnnouncements(),
        api.announcementReadIds(),
      ]);
      setItems(list);
      setReadIds(reads);
    } catch {
      setItems([]);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  if (!user || items.length === 0) return null;

  const colorFor = (level: string) => {
    if (level === "danger") return { bg: "#FEE2E2", border: "#DC2626", icon: "alert-circle" as const, tint: "#B91C1C" };
    if (level === "info") return { bg: "#DBEAFE", border: "#2563EB", icon: "information-circle" as const, tint: "#1D4ED8" };
    return { bg: "#FEF3C7", border: "#F59E0B", icon: "warning" as const, tint: "#B45309" };
  };

  return (
    <View style={styles.wrap} testID="announcements-banner">
      {items.map((a) => {
        const c = colorFor(a.level);
        return (
          <Pressable
            key={a.id}
            onPress={() => setSelected(a)}
            style={[styles.banner, { backgroundColor: c.bg, borderColor: c.border }]}
            testID={`announcement-${a.id}`}
          >
            <Ionicons name={c.icon} size={22} color={c.tint} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: c.tint }]} numberOfLines={1}>{a.title}</Text>
              <Text style={styles.msg} numberOfLines={1}>{a.message}</Text>
            </View>
            {readIds.includes(a.id) ? (
              <Ionicons name="checkmark-circle" size={20} color={c.tint} />
            ) : (
              <View style={[styles.unreadDot, { backgroundColor: c.tint }]} />
            )}
          </Pressable>
        );
      })}

      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={() => setSelected(null)}>
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            {selected ? (
              <ScrollView>
                <View style={styles.modalHeader}>
                  <Ionicons
                    name={colorFor(selected.level).icon}
                    size={32}
                    color={colorFor(selected.level).tint}
                  />
                  <Text style={styles.modalTitle}>{selected.title}</Text>
                </View>
                <Text style={styles.modalBody}>{selected.message}</Text>
                <Text style={styles.modalMeta}>
                  {selected.author_name ? `Pubblicato da ${selected.author_name}` : ""} · Valido fino al{" "}
                  {new Date(selected.expires_at).toLocaleDateString("it-IT")}
                </Text>
                <Pressable
                  onPress={async () => {
                    if (!readIds.includes(selected.id)) {
                      try {
                        await api.markAnnouncementRead(selected.id);
                        setReadIds((current) => [...current, selected.id]);
                      } catch {}
                    }
                    setSelected(null);
                  }}
                  style={styles.closeBtn}
                  testID="close-announcement"
                >
                  <Text style={styles.closeBtnText}>
                    {readIds.includes(selected.id) ? "Chiudi" : "Conferma lettura"}
                  </Text>
                </Pressable>
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: SPACING.lg, gap: SPACING.sm, marginBottom: SPACING.sm },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderLeftWidth: 4,
    ...SHADOW.card,
  },
  title: { fontSize: 14, fontWeight: "800" },
  msg: { fontSize: 12, color: COLORS.onSurface, marginTop: 2 },
  modalWrap: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", padding: SPACING.lg },
  modalCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.lg, maxHeight: "80%" },
  modalHeader: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, marginBottom: SPACING.md },
  modalTitle: { flex: 1, fontSize: 18, fontWeight: "800", color: COLORS.navy },
  modalBody: { fontSize: 15, color: COLORS.onSurface, lineHeight: 22 },
  modalMeta: { fontSize: 11, color: COLORS.onSurfaceMuted, marginTop: SPACING.lg, fontStyle: "italic" },
  closeBtn: { backgroundColor: COLORS.brand, borderRadius: RADIUS.pill, paddingVertical: 12, alignItems: "center", marginTop: SPACING.md },
  closeBtnText: { color: COLORS.white, fontWeight: "700" },
  unreadDot: { width: 10, height: 10, borderRadius: 5 },
});
