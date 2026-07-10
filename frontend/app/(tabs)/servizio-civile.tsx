import { useCallback, useEffect, useState } from "react";
import { ScrollView, View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS, SPACING, RADIUS, SHADOW, CIVIL_SERVICE_IMAGE } from "@/src/theme";
import { api, TeamMember } from "@/src/api";
import { useI18n } from "@/src/i18n";
import { useAuth } from "@/src/auth";
import LangToggle from "@/src/components/LangToggle";
import TeamGrid from "@/src/components/TeamGrid";

export default function ServizioCivile() {
  const { t } = useI18n();
  const { user } = useAuth();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTeam(await api.team("servizio_civile"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]} testID="servizio-civile-screen">
      <View style={styles.topBar}>
        <View style={{ flex: 1 }} />
        <LangToggle />
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.cover}>
          <Image source={{ uri: CIVIL_SERVICE_IMAGE }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <LinearGradient colors={["rgba(0,0,0,0.1)", "rgba(0,0,0,0.75)"]} style={StyleSheet.absoluteFill} />
          <View style={styles.coverContent}>
            <Text style={styles.coverEyebrow}>{t("cs_eyebrow")}</Text>
            <Text style={styles.coverTitle}>{t("cs_title")}</Text>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.sectionTitle}>Cos&apos;è il Servizio Civile?</Text>
          <Text style={styles.paragraph}>
            Il Servizio Civile Universale è un&apos;esperienza di crescita personale e di
            cittadinanza attiva, rivolta ai giovani tra i 18 e i 28 anni. Durante l&apos;anno di
            servizio, i ragazzi affiancano i volontari de La Provvidenza nelle attività di
            trasporto sanitario e accompagnamento di persone con disabilità.
          </Text>

          <Text style={styles.sectionTitle}>Come Partecipare</Text>
          <Text style={styles.paragraph}>
            Le iscrizioni per il bando 2026 sono ufficialmente aperte. Per partecipare è necessario:
          </Text>
          <Bullet>Avere tra i 18 e i 28 anni</Bullet>
          <Bullet>Essere cittadini italiani o dell&apos;UE</Bullet>
          <Bullet>Presentare domanda online sul portale ufficiale</Bullet>
          <Bullet>Selezionare il progetto &quot;La Provvidenza ODV&quot;</Bullet>

          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>Cosa offriamo</Text>
            <Bullet small>Compenso mensile previsto dal bando</Bullet>
            <Bullet small>Formazione generale e specifica certificata</Bullet>
            <Bullet small>Crediti formativi universitari</Bullet>
            <Bullet small>Esperienza nel volontariato sanitario</Bullet>
          </View>

          <Text style={styles.sectionTitle}>I Nostri Ragazzi</Text>
          {loading ? (
            <ActivityIndicator color={COLORS.brand} style={{ marginTop: SPACING.lg }} />
          ) : team.length === 0 ? (
            <Text style={styles.empty}>Nessun ragazzo inserito al momento.</Text>
          ) : (
            <TeamGrid team={team} currentUser={user} onReload={load} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Bullet({ children, small }: { children: React.ReactNode; small?: boolean }) {
  return (
    <View style={{ flexDirection: "row", paddingVertical: 4 }}>
      <Text style={[styles.bulletDot, small && { fontSize: 14 }]}>•</Text>
      <Text style={[styles.bulletText, small && { fontSize: 13 }]}>{children}</Text>
    </View>
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
  sectionTitle: { fontSize: 18, fontWeight: "700", color: COLORS.navy, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  paragraph: { fontSize: 14, lineHeight: 22, color: COLORS.onSurface, marginBottom: SPACING.sm },
  bulletDot: { color: COLORS.brand, fontSize: 16, marginRight: SPACING.sm, fontWeight: "900" },
  bulletText: { flex: 1, fontSize: 14, lineHeight: 21, color: COLORS.onSurface },
  benefitCard: { backgroundColor: COLORS.brandLight, borderRadius: RADIUS.md, padding: SPACING.lg, marginTop: SPACING.md, borderLeftWidth: 4, borderLeftColor: COLORS.brand },
  benefitTitle: { fontSize: 15, fontWeight: "700", color: COLORS.brand, marginBottom: SPACING.sm },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.md, marginTop: SPACING.sm },
  photoCard: { width: "30%", alignItems: "center", marginBottom: SPACING.md },
  photo: { width: "100%", aspectRatio: 1, borderRadius: RADIUS.md, ...SHADOW.card },
  photoEmpty: { backgroundColor: COLORS.brandLight, alignItems: "center", justifyContent: "center" },
  photoInitial: { fontSize: 28, fontWeight: "800", color: COLORS.brand },
  photoName: { fontSize: 12, color: COLORS.navy, marginTop: SPACING.sm, fontWeight: "700", textAlign: "center" },
  photoRole: { fontSize: 11, color: COLORS.onSurfaceMuted },
  empty: { textAlign: "center", color: COLORS.onSurfaceMuted, marginVertical: SPACING.lg },
});
