import { useMemo, useRef, useState } from "react";
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

import { api, AssistantMessage } from "@/src/api";
import { COLORS, RADIUS, SHADOW, SPACING } from "@/src/theme";
import { useAuth } from "@/src/auth";

const START_MESSAGE: AssistantMessage = {
  role: "assistant",
  content: "Ciao! Sono l’Assistente Provvidenza. Posso leggere i tuoi turni, il mezzo o il paziente assegnato e il prossimo Servizio.",
};

const QUICK = [
  "Che turno faccio domani?",
  "Quale mezzo ho assegnato?",
  "Qual è il mio prossimo Servizio?",
];

export default function AssistenteScreen() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<AssistantMessage[]>([START_MESSAGE]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const canSend = useMemo(() => input.trim().length > 0 && !sending && Boolean(user), [input, sending, user]);

  const send = async (preset?: string) => {
    const text = (preset ?? input).trim();
    if (!text || sending) return;
    const userMessage: AssistantMessage = { role: "user", content: text };
    const next = [...messages, userMessage];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const response = await api.assistantChat(text, next.slice(-10));
      setMessages((current) => [...current, { role: "assistant", content: response.reply }]);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Errore sconosciuto";
      setMessages((current) => [...current, { role: "assistant", content: `Non riesco a contattare il server: ${detail}` }]);
    } finally {
      setSending(false);
    }
  };

  const useVoiceKeyboard = () => {
    inputRef.current?.focus();
    Alert.alert(
      "Dettatura vocale",
      "Tocca il microfono della tastiera per dettare la richiesta. Il comando “Ehi Google” verrà collegato nella fase Android successiva."
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <LinearGradient colors={[COLORS.navy, "#183454"]} style={styles.header}>
          <View style={styles.iconBadge}><Ionicons name="sparkles" size={25} color={COLORS.white} /></View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Assistente Provvidenza</Text>
            <Text style={styles.subtitle}>Sola lettura · dati protetti dal tuo account</Text>
          </View>
          <View style={styles.onlineDot} />
        </LinearGradient>

        <FlatList
          data={messages}
          keyExtractor={(_, index) => String(index)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={[styles.bubble, item.role === "user" ? styles.userBubble : styles.assistantBubble]}>
              {item.role === "assistant" && <Ionicons name="sparkles" size={15} color={COLORS.brand} style={styles.bubbleIcon} />}
              <Text style={[styles.message, item.role === "user" && styles.userMessage]}>{item.content}</Text>
            </View>
          )}
          ListFooterComponent={sending ? <Text style={styles.typing}>Sto controllando…</Text> : null}
        />

        <View style={styles.quickRow}>
          {QUICK.map((item) => (
            <Pressable key={item} style={styles.quickChip} onPress={() => void send(item)} disabled={sending}>
              <Text style={styles.quickText}>{item}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.composer}>
          <Pressable style={styles.micButton} onPress={useVoiceKeyboard} accessibilityLabel="Usa dettatura vocale">
            <Ionicons name="mic" size={22} color={COLORS.brand} />
          </Pressable>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Scrivi o detta una richiesta…"
            placeholderTextColor={COLORS.onSurfaceMuted}
            multiline
            maxLength={1000}
            onSubmitEditing={() => void send()}
          />
          <Pressable style={[styles.sendButton, !canSend && styles.disabled]} onPress={() => void send()} disabled={!canSend}>
            <Ionicons name="arrow-up" size={22} color={COLORS.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.surface },
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, gap: 12 },
  iconBadge: { width: 45, height: 45, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" },
  headerText: { flex: 1 },
  title: { color: COLORS.white, fontSize: 20, fontWeight: "800" },
  subtitle: { color: "rgba(255,255,255,0.72)", fontSize: 12, marginTop: 3 },
  onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#43D17A" },
  list: { padding: SPACING.lg, paddingBottom: 18, gap: 10 },
  bubble: { maxWidth: "88%", borderRadius: RADIUS.lg, paddingHorizontal: 15, paddingVertical: 12, flexDirection: "row", alignItems: "flex-start", ...SHADOW.card },
  assistantBubble: { alignSelf: "flex-start", backgroundColor: COLORS.white, borderTopLeftRadius: 5 },
  userBubble: { alignSelf: "flex-end", backgroundColor: COLORS.navy, borderTopRightRadius: 5 },
  bubbleIcon: { marginRight: 7, marginTop: 2 },
  message: { flexShrink: 1, color: COLORS.onSurface, fontSize: 15, lineHeight: 21 },
  userMessage: { color: COLORS.white },
  typing: { color: COLORS.onSurfaceMuted, fontStyle: "italic", marginTop: 4 },
  quickRow: { paddingHorizontal: SPACING.md, paddingBottom: 10, flexDirection: "row", flexWrap: "wrap", gap: 7 },
  quickChip: { backgroundColor: "#FFF2EA", borderColor: "#FFD4BA", borderWidth: 1, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8 },
  quickText: { color: COLORS.brandDark ?? COLORS.brand, fontSize: 12, fontWeight: "700" },
  composer: { margin: SPACING.md, marginTop: 0, flexDirection: "row", alignItems: "flex-end", backgroundColor: COLORS.white, borderRadius: 22, padding: 7, gap: 7, borderWidth: 1, borderColor: COLORS.border, ...SHADOW.floating },
  micButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#FFF2EA", alignItems: "center", justifyContent: "center" },
  input: { flex: 1, minHeight: 42, maxHeight: 110, paddingHorizontal: 8, paddingVertical: 10, color: COLORS.onSurface, fontSize: 15 },
  sendButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.brand, alignItems: "center", justifyContent: "center" },
  disabled: { opacity: 0.4 },
});
