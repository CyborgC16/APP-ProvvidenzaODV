import { ScrollView, View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS, SPACING, RADIUS, SHADOW, CIVIL_SERVICE_IMAGE } from "@/src/theme";

const PLACEHOLDERS = Array.from({ length: 10 }, (_, i) => ({
  id: `civic-${i + 1}`,
  name: `Volontario ${i + 1}`,
}));

export default function ServizioCivile() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]} testID="servizio-civile-screen">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.cover}>
          <Image source={{ uri: CIVIL_SERVICE_IMAGE }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <LinearGradient
            colors={["rgba(0,0,0,0.1)", "rgba(0,0,0,0.75)"]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.coverContent}>
            <Text style={styles.coverEyebrow}>BANDO 2026 · ISCRIZIONI APERTE</Text>
            <Text style={styles.coverTitle}>Servizio Civile{"\n"}Universale</Text>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.sectionTitle}>Cos&apos;è il Servizio Civile?</Text>
          <Text style={styles.paragraph}>
            Il Servizio Civile Universale è un&apos;esperienza di crescita personale e di
            cittadinanza attiva, rivolta ai giovani tra i 18 e i 28 anni. Durante l&apos;anno di
            servizio, i ragazzi affiancano i volontari de La Provvidenza nelle attività di
            trasporto sanitario, supporto ai pazienti emodializzati e accompagnamento di persone
            con disabilità.
          </Text>

          <Text style={styles.sectionTitle}>Come Partecipare</Text>
          <Text style={styles.paragraph}>
            Le iscrizioni per il bando 2026 sono ufficialmente aperte. Per partecipare è necessario:
          </Text>
          <Bullet>Avere tra i 18 e i 28 anni (29 non compiuti)</Bullet>
          <Bullet>Essere cittadini italiani o dell&apos;Unione Europea o regolarmente soggiornanti</Bullet>
          <Bullet>Presentare domanda esclusivamente online sul portale ufficiale del Dipartimento</Bullet>
          <Bullet>Selezionare il progetto de &quot;La Provvidenza ODV&quot; - sede di Marsala</Bullet>

          <View style={styles.benefitCard}>
            <Text style={styles.benefitTitle}>Cosa offriamo</Text>
            <Bullet small>Compenso mensile previsto dal bando ufficiale</Bullet>
            <Bullet small>Formazione generale e specifica certificata</Bullet>
            <Bullet small>Crediti formativi universitari riconosciuti</Bullet>
            <Bullet small>Esperienza nel mondo del volontariato e sanitario</Bullet>
          </View>

          <Text style={styles.sectionTitle}>I Nostri Ragazzi</Text>
          <Text style={styles.paragraph}>
            Conosci i ragazzi che attualmente svolgono il servizio civile presso La Provvidenza.
          </Text>

          <View style={styles.grid}>
            {PLACEHOLDERS.map((p) => (
              <View key={p.id} style={styles.photoCard} testID={`civic-photo-${p.id}`}>
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoInitial}>{p.name.charAt(0)}</Text>
                </View>
                <Text style={styles.photoName} numberOfLines={1}>
                  {p.name}
                </Text>
              </View>
            ))}
          </View>
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
  scroll: { paddingBottom: SPACING.xxxl },
  cover: { height: 220, justifyContent: "flex-end" },
  coverContent: { padding: SPACING.lg, paddingBottom: SPACING.xl },
  coverEyebrow: { color: COLORS.brand, fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
  coverTitle: { color: COLORS.white, fontSize: 28, fontWeight: "800", marginTop: SPACING.xs, lineHeight: 34 },
  body: { padding: SPACING.lg },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: COLORS.navy, marginTop: SPACING.lg, marginBottom: SPACING.sm },
  paragraph: { fontSize: 14, lineHeight: 22, color: COLORS.onSurface, marginBottom: SPACING.sm },
  bulletDot: { color: COLORS.brand, fontSize: 16, marginRight: SPACING.sm, fontWeight: "900" },
  bulletText: { flex: 1, fontSize: 14, lineHeight: 21, color: COLORS.onSurface },
  benefitCard: {
    backgroundColor: COLORS.brandLight,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginTop: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.brand,
  },
  benefitTitle: { fontSize: 15, fontWeight: "700", color: COLORS.brand, marginBottom: SPACING.sm },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.md, marginTop: SPACING.sm },
  photoCard: {
    width: "30%",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  photoPlaceholder: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.brandLight,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW.card,
  },
  photoInitial: { fontSize: 32, fontWeight: "800", color: COLORS.brand },
  photoName: { fontSize: 12, color: COLORS.navy, marginTop: SPACING.sm, fontWeight: "600" },
});
