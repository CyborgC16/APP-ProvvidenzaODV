import { ScrollView, View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS, SPACING, RADIUS, SHADOW, AMBULANCE_IMAGE } from "@/src/theme";

const PLACEHOLDERS = Array.from({ length: 10 }, (_, i) => ({
  id: `vol-${i + 1}`,
  name: `Volontario ${i + 1}`,
  role: i % 2 === 0 ? "Soccorritore" : "Autista",
}));

export default function Volontari() {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]} testID="volontari-screen">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.cover}>
          <Image source={{ uri: AMBULANCE_IMAGE }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <LinearGradient colors={["rgba(0,0,0,0.1)", "rgba(0,0,0,0.75)"]} style={StyleSheet.absoluteFill} />
          <View style={styles.coverContent}>
            <Text style={styles.coverEyebrow}>LA NOSTRA SQUADRA</Text>
            <Text style={styles.coverTitle}>I Nostri{"\n"}Volontari</Text>
          </View>
        </View>

        <View style={styles.body}>
          <Text style={styles.paragraph}>
            La Provvidenza ODV è composta da volontari motivati e formati, che ogni giorno mettono
            il loro tempo a disposizione della comunità di Marsala. Conducono ambulanze, prestano
            assistenza ai pazienti, accompagnano persone con disabilità ai centri di cura.{"\n\n"}
            Ogni volontario ha completato un percorso di formazione certificato ANPAS ed è in
            continuo aggiornamento per garantire il miglior servizio possibile.
          </Text>

          <Text style={styles.sectionTitle}>La Squadra</Text>
          <View style={styles.grid}>
            {PLACEHOLDERS.map((p) => (
              <View key={p.id} style={styles.photoCard} testID={`vol-photo-${p.id}`}>
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoInitial}>{p.name.charAt(0)}</Text>
                </View>
                <Text style={styles.photoName} numberOfLines={1}>{p.name}</Text>
                <Text style={styles.photoRole}>{p.role}</Text>
              </View>
            ))}
          </View>

          <View style={styles.ctaCard}>
            <Text style={styles.ctaTitle}>Vuoi diventare volontario?</Text>
            <Text style={styles.ctaBody}>
              Contattaci alla mail info@laprovvidenza.it o vieni a trovarci nella nostra sede a
              Marsala. Cerchiamo sempre nuove persone motivate da accogliere nella squadra.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
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
  sectionTitle: { fontSize: 18, fontWeight: "700", color: COLORS.navy, marginTop: SPACING.lg, marginBottom: SPACING.md },
  paragraph: { fontSize: 14, lineHeight: 22, color: COLORS.onSurface },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: SPACING.md },
  photoCard: { width: "30%", alignItems: "center", marginBottom: SPACING.md },
  photoPlaceholder: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.navy,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOW.card,
  },
  photoInitial: { fontSize: 32, fontWeight: "800", color: COLORS.cream },
  photoName: { fontSize: 12, color: COLORS.navy, marginTop: SPACING.sm, fontWeight: "700" },
  photoRole: { fontSize: 11, color: COLORS.onSurfaceMuted },
  ctaCard: {
    backgroundColor: COLORS.navy,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginTop: SPACING.lg,
  },
  ctaTitle: { fontSize: 16, fontWeight: "700", color: COLORS.white, marginBottom: SPACING.sm },
  ctaBody: { fontSize: 13, color: COLORS.cream, lineHeight: 20 },
});
