import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, Switch, Modal, ActivityIndicator, ScrollView, Linking, AppState } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";

import { COLORS, SPACING, RADIUS } from "@/src/theme";
import { useAuth } from "@/src/auth";
import { storage } from "@/src/utils/storage";
import { TOKEN_KEY } from "@/src/api";
import LangToggle from "@/src/components/LangToggle";
import CrewMap from "@/src/components/CrewMap";

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL;
const POPUP_KEY = "crew_popup_seen_v1";

type Pos = {
  user_id: string;
  full_name: string;
  role: string;
  photo_b64?: string | null;
  latitude: number;
  longitude: number;
  updated_at: string;
};

export default function Crew() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [popupVisible, setPopupVisible] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [permission, setPermission] = useState<"unknown" | "granted" | "denied">("unknown");
  const [myPos, setMyPos] = useState<{ latitude: number; longitude: number } | null>(null);
  const [positions, setPositions] = useState<Pos[]>([]);
  const [loading, setLoading] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const watcherRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    storage.getItem<boolean>(POPUP_KEY, false).then((seen) => {
      if (!seen) setPopupVisible(true);
    });
  }, []);

  const dismissPopup = async () => {
    await storage.setItem(POPUP_KEY, true);
    setPopupVisible(false);
  };

  useFocusEffect(
    useCallback(() => {
      if (!authLoading && !user) router.replace("/(tabs)/account");
    }, [authLoading, user, router]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener("change", () => {});
    return () => {
      sub.remove();
      stopSharing();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connectWS = useCallback(async () => {
    if (wsRef.current) return;
    const token = await storage.secureGet<string>(TOKEN_KEY, "");
    if (!token || !BACKEND) return;
    const wsUrl = BACKEND.replace(/^http/, "ws") + `/ws/crew?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "snapshot") setPositions(msg.data || []);
        else if (msg.type === "position")
          setPositions((prev) => [...prev.filter((p) => p.user_id !== msg.data.user_id), msg.data]);
        else if (msg.type === "leave") setPositions((prev) => prev.filter((p) => p.user_id !== msg.user_id));
      } catch {}
    };
    ws.onclose = () => { wsRef.current = null; };
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const token = await storage.secureGet<string>(TOKEN_KEY, "");
      const list = await fetch(`${BACKEND}/api/crew/positions`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json());
      if (Array.isArray(list)) setPositions(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    connectWS();
    refresh();
    return () => { wsRef.current?.close(); wsRef.current = null; };
  }, [connectWS, refresh]);

  const postPos = useCallback(async (latitude: number, longitude: number) => {
    try {
      const token = await storage.secureGet<string>(TOKEN_KEY, "");
      await fetch(`${BACKEND}/api/crew/positions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ latitude, longitude }),
      });
    } catch {}
  }, []);

  const startSharing = async () => {
    let { status } = await Location.getForegroundPermissionsAsync();
    if (status !== "granted") {
      const req = await Location.requestForegroundPermissionsAsync();
      status = req.status;
    }
    setPermission(status === "granted" ? "granted" : "denied");
    if (status !== "granted") { setSharing(false); return; }
    setSharing(true);
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setMyPos({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    await postPos(loc.coords.latitude, loc.coords.longitude);
    watcherRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, distanceInterval: 20, timeInterval: 15000 },
      async (l) => {
        setMyPos({ latitude: l.coords.latitude, longitude: l.coords.longitude });
        await postPos(l.coords.latitude, l.coords.longitude);
      },
    );
  };

  const stopSharing = async () => {
    setSharing(false);
    if (watcherRef.current) { watcherRef.current.remove(); watcherRef.current = null; }
    try {
      const token = await storage.secureGet<string>(TOKEN_KEY, "");
      await fetch(`${BACKEND}/api/crew/positions`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    } catch {}
  };

  const onToggle = (v: boolean) => (v ? startSharing() : stopSharing());

  return (
    <SafeAreaView style={styles.safe} edges={["top"]} testID="crew-screen">
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Crew</Text>
          <Text style={styles.subtitle}>{positions.length} online</Text>
        </View>
        <View style={styles.shareCtrl}>
          <Text style={styles.shareLabel}>{sharing ? "ON" : "OFF"}</Text>
          <Switch value={sharing} onValueChange={onToggle} thumbColor={COLORS.white} trackColor={{ false: COLORS.borderStrong, true: COLORS.brand }} testID="crew-toggle" />
        </View>
        <Pressable onPress={refresh} hitSlop={10} testID="crew-refresh" style={styles.iconBtn}>
          <Ionicons name="refresh" size={20} color={COLORS.navy} />
        </Pressable>
        <LangToggle />
      </View>

      {permission === "denied" ? (
        <View style={styles.warn}>
          <Ionicons name="alert-circle" size={18} color={COLORS.warning} />
          <Text style={styles.warnText}>Permesso posizione negato.</Text>
          <Pressable onPress={() => Linking.openSettings()} style={styles.settingsBtn}>
            <Text style={styles.settingsBtnText}>Apri Impostazioni</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={{ flex: 1 }}>
        {loading && positions.length === 0 ? <ActivityIndicator color={COLORS.brand} style={{ marginTop: 30 }} /> : null}
        <CrewMap positions={positions} myPos={myPos} />
      </View>

      <Modal visible={popupVisible} animationType="fade" transparent onRequestClose={dismissPopup}>
        <View style={styles.modalWrap}>
          <View style={styles.modalCard}>
            <Ionicons name="location" size={48} color={COLORS.brand} style={{ alignSelf: "center" }} />
            <Text style={styles.modalTitle}>Crew · Posizione</Text>
            <Text style={styles.modalBody}>
              Questa pagina è dedicata ai nostri volontari per coordinarsi con i servizi di emodialisi.{"\n\n"}
              L&apos;accesso alla posizione <Text style={{ fontWeight: "700" }}>non è obbligatorio</Text> e
              comunque verrà disattivato quando chiudi l&apos;app.{"\n\n"}
              Se non vuoi partecipare, torna semplicemente indietro.
            </Text>
            <View style={{ flexDirection: "row", gap: SPACING.sm, marginTop: SPACING.md }}>
              <Pressable onPress={() => { dismissPopup(); router.back(); }} style={[styles.btn, styles.btnSec]} testID="crew-popup-back">
                <Text style={styles.btnSecText}>Indietro</Text>
              </Pressable>
              <Pressable onPress={dismissPopup} style={[styles.btn, styles.btnPri]} testID="crew-popup-ok">
                <Text style={styles.btnPriText}>Ho capito</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.surface },
  header: { flexDirection: "row", alignItems: "center", padding: SPACING.lg, gap: SPACING.sm, backgroundColor: COLORS.surfaceSecondary, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { fontSize: 18, fontWeight: "700", color: COLORS.navy },
  subtitle: { fontSize: 12, color: COLORS.onSurfaceMuted, marginTop: 2 },
  shareCtrl: { flexDirection: "row", alignItems: "center", gap: 6 },
  shareLabel: { fontSize: 11, fontWeight: "700", color: COLORS.brand },
  iconBtn: { padding: 8, borderRadius: RADIUS.sm, backgroundColor: COLORS.surfaceTertiary },
  warn: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, padding: SPACING.md, backgroundColor: "#FFF7E0", borderBottomWidth: 1, borderBottomColor: COLORS.warning },
  warnText: { flex: 1, fontSize: 13, color: COLORS.onSurface },
  settingsBtn: { backgroundColor: COLORS.warning, borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 6 },
  settingsBtnText: { color: COLORS.white, fontWeight: "700", fontSize: 12 },
  modalWrap: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: SPACING.lg },
  modalCard: { backgroundColor: COLORS.surface, borderRadius: RADIUS.lg, padding: SPACING.lg },
  modalTitle: { fontSize: 20, fontWeight: "700", color: COLORS.navy, textAlign: "center", marginTop: SPACING.md },
  modalBody: { fontSize: 14, color: COLORS.onSurface, lineHeight: 22, marginTop: SPACING.md },
  btn: { flex: 1, paddingVertical: 14, borderRadius: RADIUS.md, alignItems: "center" },
  btnPri: { backgroundColor: COLORS.brand },
  btnPriText: { color: COLORS.white, fontWeight: "700" },
  btnSec: { backgroundColor: COLORS.surfaceTertiary },
  btnSecText: { color: COLORS.navy, fontWeight: "600" },
});
