import { useCallback, useEffect, useState } from "react";
import { ScrollView, View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS, SPACING, RADIUS, SHADOW, AMBULANCE_IMAGE } from "@/src/theme";
import { api, TeamMember } from "@/src/api";
import { useI18n } from "@/src/i18n";
import LangToggle from "@/src/components/LangToggle";

export default function Volontari() {
  const { t } = useI18n();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTeam(await api.team("admin"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]} testID="volontari-screen">
      <View style={styles.topBar}>
        <View style={{ flex: 1 }} />
        <LangToggle />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.cover}>
          <Image source={{ uri: AMBULANCE_IMAGE }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <LinearGradient colors={["rgba(0,0,0,0.1)", "rgba(0,0,0,0.75)"]} style={StyleSheet.absoluteFill} />
          <View style={styles.coverContent}>
            <Text style={styles.coverEyebrow}>{t("vol_eyebrow")}</Text>
            <Text style={styles.coverTitle}>{t("vol_title")}</Text>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.paragraph}>
            La Provvidenza ODV è composta da volontari motivati e formati, che ogni giorno mettono
            il loro tempo a disposizione della comunità di Marsala. Ogni volontario ha completato
            un percorso di formazione certificato ANPAS.
          </Text>

          <Text style={styles.sectionTitle}>La Squadra</Text>
          {loading ? (
            <ActivityIndicator color={COLORS.brand} style={{ marginTop: SPACING.lg }} />
          ) : team.length === 0 ? (
            <Text style={styles.empty}>Nessun volontario inserito. L&apos;admin li aggiungerà a breve.</Text>
          ) : (
            <View style={styles.grid}>
              {team.map((m) => (
                <View key={m.id} style={styles.photoCard} testID={`vol-${m.id}`}>
                  {m.photo_b64 ? (
                    <Image source={{ uri: m.photo_b64 }} style={styles.photo} contentFit="cover" />
                  ) : (
                    <View style={[styles.photo, styles.photoEmpty]}>
                      <Text style={styles.photoInitial}>{m.full_name.charAt(0)}</Text>
                    </View>
                  )}
                  <Text style={styles.photoName} numberOfLines={1}>{m.full_name}</Text>
                  {m.age ? <Text style={styles.photoRole}>{m.age} anni</Text> : null}
                  {m.bio ? <Text style={styles.bio} numberOfLines={3}>{m.bio}</Text> : null}
                </View>
              ))}
            </View>
          )}

          <View style={styles.ctaCard}>
            <Text style={styles.ctaTitle}>Vuoi diventare volontario?</Text>
            <Text style={styles.ctaBody}>
              Contattaci a info@laprovvidenza.it o vieni a trovarci nella sede di Marsala.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.surface },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: SPACING.lg, paddingTop: SPACING.sm, paddingBottom: SPACING.sm },
  scroll: { paddingBottom: SPACING.xxxl },
  cover: { height: 200, justifyContent: "flex-end", marginHorizontal: SPACING.lg, borderRadius: RADIUS.lg, overflow: "hidden" },
  coverContent: { padding: SPACING.lg, paddingBottom: SPACING.lg },
  coverEyebrow: { color: COLORS.brand, fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
  coverTitle: { color: COLORS.white, fontSize: 28, fontWeight: "800", marginTop: SPACING.xs, lineHeight: 34 },
  body: { padding: SPACING.lg },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: COLORS.navy, marginTop: SPACING.lg, marginBottom: SPACING.md },
  paragraph: { fontSize: 14, lineHeight: 22, color: COLORS.onSurface },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.md },
  photoCard: { width: "30%", alignItems: "center", marginBottom: SPACING.md },
  photo: { width: "100%", aspectRatio: 1, borderRadius: RADIUS.md, ...SHADOW.card },
  photoEmpty: { backgroundColor: COLORS.navy, alignItems: "center", justifyContent: "center" },
  photoInitial: { fontSize: 28, fontWeight: "800", color: COLORS.cream },
  photoName: { fontSize: 12, color: COLORS.navy, marginTop: SPACING.sm, fontWeight: "700", textAlign: "center" },
  photoRole: { fontSize: 11, color: COLORS.onSurfaceMuted },
  bio: { fontSize: 10, color: COLORS.onSurfaceMuted, textAlign: "center", marginTop: 2 },
  empty: { textAlign: "center", color: COLORS.onSurfaceMuted, marginVertical: SPACING.lg },
  ctaCard: { backgroundColor: COLORS.navy, borderRadius: RADIUS.md, padding: SPACING.lg, marginTop: SPACING.lg },
  ctaTitle: { fontSize: 16, fontWeight: "700", color: COLORS.white, marginBottom: SPACING.sm },
  ctaBody: { fontSize: 13, color: COLORS.cream, lineHeight: 20 },
});
