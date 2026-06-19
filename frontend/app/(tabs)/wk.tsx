import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, Switch, Platform, ActivityIndicator, AppState, ScrollView } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioRecorder,
} from "expo-audio";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import * as FileSystem from "expo-file-system/legacy";

import { COLORS, SPACING, RADIUS, SHADOW } from "@/src/theme";
import { useAuth } from "@/src/auth";
import { storage } from "@/src/utils/storage";
import { TOKEN_KEY } from "@/src/api";
import LangToggle from "@/src/components/LangToggle";

const BACKEND = process.env.EXPO_PUBLIC_BACKEND_URL;
const KEEP_TAG = "wk-active";

type OnlineUser = {
  user_id: string;
  full_name: string;
  role: string;
  photo_b64?: string | null;
};

export default function WK() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [active, setActive] = useState(false);
  const [frequency, setFrequency] = useState<"servizio_civile" | "admin">(
    user?.role === "admin" || user?.role === "master" ? "admin" : "servizio_civile",
  );
  const [recording, setRecording] = useState(false);
  const [lastFrom, setLastFrom] = useState<string | null>(null);
  const [online, setOnline] = useState<OnlineUser[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const player = useAudioPlayer();
  // Silent loop player: keeps the media session alive on Android so the JS thread
  // and the WebSocket are not suspended when the screen is locked.
  const silentPlayer = useAudioPlayer(require("@/assets/audio/silent.wav"));

  const canSwitch = user?.role === "admin" || user?.role === "master";

  useFocusEffect(
    useCallback(() => {
      if (!authLoading && !user) router.replace("/(tabs)/account");
    }, [authLoading, user, router]),
  );

  // Configure audio for background playback (also through screen lock)
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      allowsRecording: true,
      interruptionMode: "doNotMix",
      shouldRouteThroughEarpiece: false,
    } as any).catch(() => {});
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", () => {});
    return () => {
      sub.remove();
      stopWK();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = useCallback(async () => {
    if (wsRef.current) {
      try { wsRef.current.close(); } catch {}
    }
    const token = await storage.secureGet<string>(TOKEN_KEY, "");
    if (!token || !BACKEND) return;
    const url = BACKEND.replace(/^http/, "ws") + `/ws/wk/${frequency}?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;
    ws.onmessage = async (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "audio" && msg.audio_b64) {
          setLastFrom(msg.from || null);
          try {
            player.replace({ uri: `data:${msg.mime || "audio/mp4"};base64,${msg.audio_b64}` });
            player.play();
          } catch {}
        } else if (msg.type === "presence") {
          setOnline(msg.online || []);
        }
      } catch {}
    };
    ws.onclose = () => {
      wsRef.current = null;
      // Auto-reconnect if still active
      if (active) {
        setTimeout(() => { if (active) connect(); }, 1500);
      }
    };
  }, [frequency, player, active]);

  const startWK = async () => {
    if (Platform.OS !== "web") {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        setActive(false);
        return;
      }
    }
    try { await activateKeepAwakeAsync(KEEP_TAG); } catch {}
    // Start silent loop to keep audio focus / media session alive when screen is locked
    if (Platform.OS !== "web") {
      try {
        silentPlayer.loop = true;
        silentPlayer.volume = 0;
        silentPlayer.play();
      } catch {}
    }
    setActive(true);
    connect();
  };

  const stopWK = () => {
    setActive(false);
    if (wsRef.current) {
      try { wsRef.current.close(); } catch {}
      wsRef.current = null;
    }
    if (recording) {
      try { recorder.stop(); } catch {}
      setRecording(false);
    }
    if (Platform.OS !== "web") {
      try { silentPlayer.pause(); } catch {}
    }
    try { deactivateKeepAwake(KEEP_TAG); } catch {}
    setOnline([]);
  };

  useEffect(() => {
    if (active) connect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frequency]);

  const startTalk = async () => {
    if (!active || recording) return;
    setRecording(true);
    try {
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch {
      setRecording(false);
    }
  };

  const stopTalk = async () => {
    if (!recording) return;
    setRecording(false);
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (uri && wsRef.current?.readyState === WebSocket.OPEN) {
        const b64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        wsRef.current.send(JSON.stringify({
          type: "audio",
          audio_b64: b64,
          mime: Platform.OS === "ios" ? "audio/m4a" : "audio/mp4",
          from: user?.full_name || "?",
        }));
      }
    } catch {}
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]} testID="wk-screen">
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>WK · Walkie</Text>
          <Text style={styles.subtitle}>
            Canale: <Text style={{ color: COLORS.brand, fontWeight: "700" }}>{frequency === "admin" ? "Volontari" : "Servizio Civile"}</Text>
          </Text>
        </View>
        <View style={styles.shareCtrl}>
          <Text style={styles.shareLabel}>{active ? "ON" : "OFF"}</Text>
          <Switch
            value={active}
            onValueChange={(v) => (v ? startWK() : stopWK())}
            thumbColor={COLORS.white}
            trackColor={{ false: COLORS.borderStrong, true: COLORS.brand }}
            testID="wk-toggle"
          />
        </View>
        <LangToggle />
      </View>

      {canSwitch ? (
        <View style={styles.freqRow}>
          <Pressable
            onPress={() => setFrequency("admin")}
            style={[styles.freqChip, frequency === "admin" && styles.freqChipSel]}
            testID="freq-vol"
          >
            <Ionicons name="people" size={16} color={frequency === "admin" ? COLORS.white : COLORS.navy} />
            <Text style={[styles.freqText, frequency === "admin" && { color: COLORS.white }]}>Volontari</Text>
          </Pressable>
          <Pressable
            onPress={() => setFrequency("servizio_civile")}
            style={[styles.freqChip, frequency === "servizio_civile" && styles.freqChipSel]}
            testID="freq-sc"
          >
            <Ionicons name="heart" size={16} color={frequency === "servizio_civile" ? COLORS.white : COLORS.navy} />
            <Text style={[styles.freqText, frequency === "servizio_civile" && { color: COLORS.white }]}>Servizio Civile</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.body}>
        <View style={styles.statusCard}>
          <View style={[styles.statusDot, { backgroundColor: active ? COLORS.success : COLORS.onSurfaceMuted }]} />
          <Text style={styles.statusText}>
            {active
              ? `Walkie attivo · ${online.length} online sul canale`
              : "Walkie spento. Attivalo dall'interruttore in alto."}
          </Text>
        </View>

        {active && online.length > 0 ? (
          <View style={styles.onlineWrap}>
            <Text style={styles.onlineTitle}>Online ora:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.onlineRow}>
              {online.map((u) => (
                <View key={u.user_id} style={styles.onlineChip} testID={`wk-online-${u.user_id}`}>
                  {u.photo_b64 ? (
                    <Image source={{ uri: u.photo_b64 }} style={styles.onlineAvatar} contentFit="cover" />
                  ) : (
                    <View style={[styles.onlineAvatar, styles.onlineAvatarEmpty]}>
                      <Text style={styles.onlineInitial}>{u.full_name.charAt(0)}</Text>
                    </View>
                  )}
                  <Text style={styles.onlineName} numberOfLines={1}>{u.full_name.split(" ")[0]}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {lastFrom ? (
          <View style={styles.lastFromCard}>
            <Ionicons name="volume-high" size={18} color={COLORS.brand} />
            <Text style={styles.lastFromText}>Ultimo da: <Text style={{ fontWeight: "700" }}>{lastFrom}</Text></Text>
          </View>
        ) : null}

        <View style={{ flex: 1 }} />

        <Pressable
          onPressIn={startTalk}
          onPressOut={stopTalk}
          disabled={!active}
          style={[styles.ptt, !active && { opacity: 0.4 }, recording && styles.pttRec]}
          testID="ptt-button"
        >
          {recording ? <ActivityIndicator color={COLORS.white} size="large" /> : <Ionicons name="mic" size={56} color={COLORS.white} />}
          <Text style={styles.pttLabel}>{recording ? "TRASMETTENDO" : "TIENI PREMUTO"}</Text>
        </Pressable>

        <Text style={styles.hint}>
          Lascia l&apos;app aperta o in background. La trasmissione funziona anche a schermo bloccato.
        </Text>
      </View>
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
  freqRow: { flexDirection: "row", gap: SPACING.sm, padding: SPACING.md, backgroundColor: COLORS.surfaceSecondary, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  freqChip: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: RADIUS.pill, backgroundColor: COLORS.surfaceTertiary },
  freqChipSel: { backgroundColor: COLORS.brand },
  freqText: { fontWeight: "700", color: COLORS.navy, fontSize: 13 },
  body: { flex: 1, padding: SPACING.lg, alignItems: "center" },
  statusCard: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, padding: SPACING.md, backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.md, width: "100%", ...SHADOW.card },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { flex: 1, fontSize: 13, color: COLORS.onSurface },
  onlineWrap: { width: "100%", marginTop: SPACING.sm },
  onlineTitle: { fontSize: 12, color: COLORS.onSurfaceMuted, marginBottom: 6, fontWeight: "600" },
  onlineRow: { gap: SPACING.sm, paddingRight: SPACING.lg },
  onlineChip: { alignItems: "center", width: 64, flexShrink: 0 },
  onlineAvatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderColor: COLORS.success },
  onlineAvatarEmpty: { backgroundColor: COLORS.brandLight, alignItems: "center", justifyContent: "center" },
  onlineInitial: { fontSize: 16, fontWeight: "800", color: COLORS.brand },
  onlineName: { fontSize: 11, color: COLORS.navy, marginTop: 4, fontWeight: "600", textAlign: "center" },
  lastFromCard: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, padding: SPACING.md, backgroundColor: COLORS.brandLight, borderRadius: RADIUS.md, width: "100%", marginTop: SPACING.sm },
  lastFromText: { flex: 1, fontSize: 13, color: COLORS.onSurface },
  ptt: { width: 200, height: 200, borderRadius: 100, backgroundColor: COLORS.brand, alignItems: "center", justifyContent: "center", marginBottom: SPACING.lg, ...SHADOW.fab },
  pttRec: { backgroundColor: COLORS.error, transform: [{ scale: 1.06 }] },
  pttLabel: { color: COLORS.white, fontWeight: "800", fontSize: 13, marginTop: SPACING.sm, letterSpacing: 1 },
  hint: { fontSize: 12, color: COLORS.onSurfaceMuted, textAlign: "center", paddingHorizontal: SPACING.lg, marginBottom: SPACING.lg },
});
