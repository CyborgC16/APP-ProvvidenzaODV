import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

import { api, AssistantMessage, AssistantChatResponse } from "@/src/api";
import { COLORS, RADIUS, SHADOW, SPACING } from "@/src/theme";
import { useAuth } from "@/src/auth";

type ChatItem = AssistantMessage & { id: string; timestamp: string };

const makeMessage = (role: "user" | "assistant", content: string): ChatItem => ({
  id: `${Date.now()}-${Math.random()}`,
  role,
  content,
  timestamp: new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
});

const QUICK = [
  "Aggiungi un servizio domani alle 15",
  "Annulla l’ultimo servizio",
  "Che turno faccio domani?",
  "Riepilogo servizi questa settimana",
  "Quale mezzo ho assegnato domani?",
  "Quale paziente ho domani?",
];

export default function AssistenteScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{ prompt?: string | string[] }>();
  const incomingUrl = Linking.useURL();
  const handledVoiceRequests = useRef(new Set<string>());
  const [messages, setMessages] = useState<ChatItem[]>([
    makeMessage("assistant", "Ciao! Parlami normalmente: posso creare o annullare servizi, consultare turni, mezzi e pazienti, e preparare statistiche rapide."),
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [lastResponse, setLastResponse] = useState<AssistantChatResponse | null>(null);
  const inputRef = useRef<TextInput>(null);
  const listRef = useRef<FlatList<ChatItem>>(null);
  const canSend = useMemo(() => input.trim().length > 0 && !sending && Boolean(user), [input, sending, user]);

  const send = useCallback(async (preset?: string) => {
    const text = (preset ?? input).trim();
    if (!text || sending || !user) return;
    const userMessage = makeMessage("user", text);
    const next = [...messages, userMessage];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const history: AssistantMessage[] = next.slice(-10).map(({ role, content }) => ({ role, content }));
      const response = await api.assistantChat(text, history);
      setLastResponse(response);
      setMessages((current) => [...current, makeMessage("assistant", response.reply)]);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Errore sconosciuto";
      setMessages((current) => [...current, makeMessage("assistant", `Non riesco a completare la richiesta: ${detail}`)]);
    } finally {
      setSending(false);
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [input, messages, sending, user]);

  useEffect(() => {
    if (!user || sending) return;

    const routePrompt = Array.isArray(params.prompt) ? params.prompt[0] : params.prompt;
    let urlPrompt: string | undefined;
    if (incomingUrl) {
      const parsed = Linking.parse(incomingUrl);
      const rawPrompt = parsed.queryParams?.prompt;
      urlPrompt = Array.isArray(rawPrompt) ? String(rawPrompt[0]) : rawPrompt ? String(rawPrompt) : undefined;
    }

    const prompt = (urlPrompt || routePrompt || "").trim();
    if (!prompt) return;

    const requestKey = `${incomingUrl || "route"}:${prompt}`;
    if (handledVoiceRequests.current.has(requestKey)) return;
    handledVoiceRequests.current.add(requestKey);

    const timer = setTimeout(() => void send(prompt), 250);
    return () => clearTimeout(timer);
  }, [incomingUrl, params.prompt, send, sending, user]);

  const useVoiceKeyboard = () => {
    inputRef.current?.focus();
    Alert.alert("Dettatura vocale", "Tocca il microfono della tastiera e pronuncia la richiesta.");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <LinearGradient colors={[COLORS.navy, "#183454"]} style={styles.header}>
          <View style={styles.iconBadge}><Ionicons name="sparkles" size={25} color={COLORS.white} /></View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Assistente Provvidenza</Text>
            <Text style={styles.subtitle}>Linguaggio naturale · conferma obbligatoria</Text>
          </View>
          <View style={styles.onlineDot} />
        </LinearGradient>

        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => (
            <View style={[styles.messageBlock, item.role === "user" ? styles.userBlock : styles.assistantBlock]}>
              <View style={[styles.bubble, item.role === "user" ? styles.userBubble : styles.assistantBubble]}>
                {item.role === "assistant" && <Ionicons name="sparkles" size={15} color={COLORS.brand} style={styles.bubbleIcon} />}
                <Text style={[styles.message, item.role === "user" && styles.userMessage]}>{item.content}</Text>
              </View>
              <Text style={[styles.timestamp, item.role === "user" && styles.userTimestamp]}>{item.timestamp}</Text>
            </View>
          )}
          ListFooterComponent={sending ? <View style={styles.typingBubble}><Text style={styles.typing}>Sto elaborando…</Text></View> : null}
        />

        {lastResponse?.requires_confirmation && !sending ? (
          <View style={styles.confirmRow}>
            <Pressable style={[styles.confirmButton, styles.cancelButton]} onPress={() => void send("annulla")}>
              <Ionicons name="close" size={18} color={COLORS.onSurface} />
              <Text style={styles.cancelText}>Annulla</Text>
            </Pressable>
            <Pressable style={[styles.confirmButton, styles.okButton]} onPress={() => void send("confermo")}>
              <Ionicons name="checkmark" size={18} color={COLORS.white} />
              <Text style={styles.okText}>Conferma</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.quickRow}>
            {QUICK.map((item) => (
              <Pressable key={item} style={styles.quickChip} onPress={() => void send(item)} disabled={sending}>
                <Text style={styles.quickText}>{item}</Text>
              </Pressable>
            ))}
          </View>
        )}

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
  messageBlock: { maxWidth: "88%" },
  userBlock: { alignSelf: "flex-end", alignItems: "flex-end" },
  assistantBlock: { alignSelf: "flex-start", alignItems: "flex-start" },
  bubble: { borderRadius: RADIUS.lg, paddingHorizontal: 15, paddingVertical: 12, flexDirection: "row", alignItems: "flex-start", ...SHADOW.card },
  assistantBubble: { backgroundColor: COLORS.white, borderTopLeftRadius: 5 },
  userBubble: { backgroundColor: COLORS.navy, borderTopRightRadius: 5 },
  bubbleIcon: { marginRight: 7, marginTop: 2 },
  message: { flexShrink: 1, color: COLORS.onSurface, fontSize: 15, lineHeight: 22 },
  userMessage: { color: COLORS.white },
  timestamp: { fontSize: 10, color: COLORS.onSurfaceMuted, marginTop: 4, marginLeft: 8 },
  userTimestamp: { marginLeft: 0, marginRight: 8 },
  typingBubble: { alignSelf: "flex-start", backgroundColor: COLORS.white, borderRadius: RADIUS.lg, paddingHorizontal: 14, paddingVertical: 10 },
  typing: { color: COLORS.onSurfaceMuted, fontStyle: "italic" },
  quickRow: { paddingHorizontal: SPACING.md, paddingBottom: 10, flexDirection: "row", flexWrap: "wrap", gap: 7 },
  quickChip: { backgroundColor: "#FFF2EA", borderColor: "#FFD4BA", borderWidth: 1, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 8 },
  quickText: { color: COLORS.brandDark ?? COLORS.brand, fontSize: 12, fontWeight: "700" },
  confirmRow: { flexDirection: "row", gap: 10, paddingHorizontal: SPACING.md, paddingBottom: 10 },
  confirmButton: { flex: 1, height: 46, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 },
  cancelButton: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border },
  okButton: { backgroundColor: COLORS.brand },
  cancelText: { color: COLORS.onSurface, fontWeight: "800" },
  okText: { color: COLORS.white, fontWeight: "800" },
  composer: { margin: SPACING.md, marginTop: 0, flexDirection: "row", alignItems: "flex-end", backgroundColor: COLORS.white, borderRadius: 22, padding: 7, gap: 7, borderWidth: 1, borderColor: COLORS.border, ...SHADOW.floating },
  micButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#FFF2EA", alignItems: "center", justifyContent: "center" },
  input: { flex: 1, minHeight: 42, maxHeight: 110, paddingHorizontal: 8, paddingVertical: 10, color: COLORS.onSurface, fontSize: 15 },
  sendButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.brand, alignItems: "center", justifyContent: "center" },
  disabled: { opacity: 0.4 },
});
