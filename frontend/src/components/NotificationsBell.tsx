import { useCallback, useState } from "react";
import { View, Text, StyleSheet, Pressable, Modal, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";

import { COLORS, SPACING, RADIUS } from "@/src/theme";
import { api, NotificationItem } from "@/src/api";

function timeAgo(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "ora";
    if (m < 60) return `${m} min fa`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} h fa`;
    const d = Math.floor(h / 24);
    return `${d} g fa`;
  } catch {
    return "";
  }
}

export default function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await api.listNotifications());
    } catch {
      // ignore
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const unread = items.filter((i) => !i.read).length;

  const openModal = async () => {
    setOpen(true);
    setLoading(true);
    await load();
    setLoading(false);
  };

  const markAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      await load();
    } catch {
      // ignore
    }
  };

  return (
    <>
      <Pressable onPress={openModal} hitSlop={10} style={styles.iconBtn} testID="notifications-bell">
        <Ionicons name="notifications-outline" size={22} color={COLORS.navy} />
        {unread > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unread > 9 ? "9+" : unread}</Text>
          </View>
        ) : null}
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.title}>Notifiche</Text>
              <View style={{ flexDirection: "row", gap: SPACING.sm }}>
                {items.length > 0 ? (
                  <Pressable onPress={markAllRead} testID="notif-mark-all">
                    <Text style={styles.markAll}>Segna lette</Text>
                  </Pressable>
                ) : null}
                <Pressable onPress={() => setOpen(false)} hitSlop={10} testID="notif-close">
                  <Ionicons name="close" size={24} color={COLORS.navy} />
                </Pressable>
              </View>
            </View>
            {loading ? (
              <ActivityIndicator color={COLORS.brand} style={{ marginVertical: SPACING.xl }} />
            ) : items.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="notifications-off-outline" size={40} color={COLORS.onSurfaceMuted} />
                <Text style={styles.emptyText}>Nessuna notifica</Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 420 }}>
                {items.map((n) => (
                  <View key={n.id} style={[styles.item, !n.read && styles.itemUnread]} testID={`notif-${n.id}`}>
                    <View style={[styles.dot, { backgroundColor: n.level === "warning" ? COLORS.warning : COLORS.brand }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTitle}>{n.title}</Text>
                      <Text style={styles.itemMsg}>{n.message}</Text>
                      <Text style={styles.itemTime}>{timeAgo(n.created_at)}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  iconBtn: { padding: 8, borderRadius: RADIUS.sm, backgroundColor: COLORS.surfaceTertiary },
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.error,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: { color: COLORS.white, fontSize: 10, fontWeight: "800" },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: RADIUS.lg, borderTopRightRadius: RADIUS.lg, padding: SPACING.lg, paddingBottom: SPACING.xxl },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: SPACING.md },
  title: { fontSize: 18, fontWeight: "800", color: COLORS.navy },
  markAll: { color: COLORS.brand, fontWeight: "700", fontSize: 13 },
  empty: { alignItems: "center", padding: SPACING.xxl, gap: SPACING.sm },
  emptyText: { color: COLORS.onSurfaceMuted, fontSize: 14 },
  item: { flexDirection: "row", gap: SPACING.sm, padding: SPACING.md, borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceSecondary, marginBottom: SPACING.sm, alignItems: "flex-start" },
  itemUnread: { backgroundColor: COLORS.brandLight },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  itemTitle: { fontSize: 14, fontWeight: "700", color: COLORS.navy },
  itemMsg: { fontSize: 13, color: COLORS.onSurface, marginTop: 2 },
  itemTime: { fontSize: 11, color: COLORS.onSurfaceMuted, marginTop: 4 },
});
