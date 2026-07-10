import { ScrollView, View, Text, StyleSheet, Pressable, Alert, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";

import { COLORS, SPACING, RADIUS, SHADOW } from "@/src/theme";
import { useAuth } from "@/src/auth";
import { api } from "@/src/api";

export default function Impostazioni() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = () => {
    Alert.alert(
      "Cancella account",
      "Sei sicuro di voler eliminare definitivamente il tuo account? Questa azione è irreversibile e rimuove i tuoi dati personali dall'app.",
      [
        { text: "Annulla", style: "cancel" },
        {
          text: "Elimina",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await api.deleteOwnAccount();
              await logout();
              router.replace("/(tabs)/account");
            } catch (e: any) {
              Alert.alert("Errore", e.message || "Impossibile eliminare l'account");
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]} testID="impostazioni-screen">
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={COLORS.navy} />
        </Pressable>
        <Text style={styles.headerTitle}>Impostazioni</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.sm }}>
        <Text style={styles.sectionLabel}>Legale</Text>
        <Pressable style={styles.row} onPress={() => router.push("/legal/privacy")} testID="link-privacy">
          <Ionicons name="shield-checkmark" size={22} color={COLORS.brand} />
          <Text style={styles.rowText}>Privacy Policy</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.onSurfaceMuted} />
        </Pressable>
        <Pressable style={styles.row} onPress={() => router.push("/legal/terms")} testID="link-terms">
          <Ionicons name="document-text" size={22} color={COLORS.brand} />
          <Text style={styles.rowText}>Termini di Servizio</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.onSurfaceMuted} />
        </Pressable>

        {user ? (
          <>
            <Text style={[styles.sectionLabel, { marginTop: SPACING.lg }]}>Pericolo</Text>
            <Pressable style={[styles.row, styles.rowDanger]} onPress={confirmDelete} disabled={deleting} testID="delete-account-btn">
              {deleting ? (
                <ActivityIndicator color={COLORS.error} />
              ) : (
                <Ionicons name="trash" size={22} color={COLORS.error} />
              )}
              <Text style={[styles.rowText, { color: COLORS.error }]}>Cancella il mio account</Text>
              <View style={{ width: 20 }} />
            </Pressable>
            <Text style={styles.hint}>
              L&apos;eliminazione è definitiva: nome, email, foto profilo, bio e assegnazioni turno saranno rimossi.
            </Text>
          </>
        ) : null}

        <View style={{ height: SPACING.xxl }} />
        <Text style={styles.copy}>La Provvidenza ODV · Marsala {`\n`}Affiliata ANPAS</Text>
      </ScrollView>
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
  sectionLabel: { fontSize: 12, fontWeight: "700", color: COLORS.onSurfaceMuted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    paddingHorizontal: SPACING.md,
    ...SHADOW.card,
  },
  rowDanger: { backgroundColor: "#FEE2E2" },
  rowText: { flex: 1, fontSize: 14, fontWeight: "600", color: COLORS.navy },
  hint: { fontSize: 12, color: COLORS.onSurfaceMuted, marginTop: SPACING.xs, paddingHorizontal: SPACING.sm, lineHeight: 17 },
  copy: { fontSize: 11, color: COLORS.onSurfaceMuted, textAlign: "center", marginTop: SPACING.xl },
});
