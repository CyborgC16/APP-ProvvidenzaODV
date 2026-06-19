import { ScrollView, View, Text, StyleSheet, Pressable } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS, SPACING, RADIUS, SHADOW, LOGO_URL, HERO_IMAGE, AMBULANCE_IMAGE, CIVIL_SERVICE_IMAGE } from "@/src/theme";

export default function Home() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe} edges={["top"]} testID="home-screen">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Image source={{ uri: LOGO_URL }} style={styles.headerLogo} contentFit="contain" />
          <View style={{ flex: 1 }}>
            <Text style={styles.brandTitle}>La Provvidenza ODV</Text>
            <Text style={styles.brandSubtitle}>Pubblica Assistenza · Marsala</Text>
          </View>
        </View>

        {/* Hero */}
        <Pressable
          testID="home-hero-card"
          onPress={() => router.push("/(tabs)/prenota")}
          style={({ pressed }) => [styles.hero, pressed && { opacity: 0.92 }]}
        >
          <Image source={{ uri: HERO_IMAGE }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <LinearGradient
            colors={["rgba(0,0,0,0.05)", "rgba(0,0,0,0.75)"]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroContent}>
            <Text style={styles.heroEyebrow}>SERVIZIO 24/7 · MARSALA</Text>
            <Text style={styles.heroTitle}>Prenota un{"\n"}Trasporto Sanitario</Text>
            <Text style={styles.heroSub}>Ambulanza · Furgone Disabili · Emodialisi</Text>
            <View style={styles.heroCTA} testID="home-cta-prenota">
              <Text style={styles.heroCTAText}>Prenota Ora</Text>
              <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
            </View>
          </View>
        </Pressable>

        {/* Services */}
        <Text style={styles.sectionTitle}>I Nostri Servizi</Text>
        <View style={styles.servicesRow}>
          <View style={styles.serviceCard} testID="service-emodialisi">
            <View style={[styles.iconBubble, { backgroundColor: COLORS.brandLight }]}>
              <Ionicons name="heart-circle" size={26} color={COLORS.brand} />
            </View>
            <Text style={styles.serviceTitle}>Emodialisi</Text>
            <Text style={styles.serviceDesc}>Trasporto pazienti in ambulanza per terapie dialitiche.</Text>
          </View>
          <View style={styles.serviceCard} testID="service-disabili">
            <View style={[styles.iconBubble, { backgroundColor: COLORS.brandLight }]}>
              <Ionicons name="accessibility" size={26} color={COLORS.brand} />
            </View>
            <Text style={styles.serviceTitle}>Disabili</Text>
            <Text style={styles.serviceDesc}>Furgone attrezzato per trasporto carrozzine.</Text>
          </View>
        </View>

        {/* Quick links */}
        <Text style={styles.sectionTitle}>Conoscici</Text>
        <View style={styles.linksRow}>
          <Pressable
            testID="link-servizio-civile"
            onPress={() => router.push("/(tabs)/servizio-civile")}
            style={styles.linkCard}
          >
            <Image source={{ uri: CIVIL_SERVICE_IMAGE }} style={StyleSheet.absoluteFill} contentFit="cover" />
            <LinearGradient colors={["transparent", "rgba(0,0,0,0.7)"]} style={StyleSheet.absoluteFill} />
            <Text style={styles.linkLabel}>Servizio Civile</Text>
          </Pressable>
          <Pressable
            testID="link-volontari"
            onPress={() => router.push("/(tabs)/volontari")}
            style={styles.linkCard}
          >
            <Image source={{ uri: AMBULANCE_IMAGE }} style={StyleSheet.absoluteFill} contentFit="cover" />
            <LinearGradient colors={["transparent", "rgba(0,0,0,0.7)"]} style={StyleSheet.absoluteFill} />
            <Text style={styles.linkLabel}>I Nostri Volontari</Text>
          </Pressable>
        </View>

        {/* About */}
        <View style={styles.aboutCard}>
          <Text style={styles.aboutTitle}>Chi Siamo</Text>
          <Text style={styles.aboutBody}>
            La Provvidenza ODV è un&apos;associazione di volontariato di pubblica assistenza con sede a Marsala,
            affiliata ANPAS. Offriamo servizi di trasporto sanitario per pazienti emodializzati e
            trasporto disabili in carrozzina con ambulanze e furgoni attrezzati. {`\n\n`}
            Grazie alla nostra rete di volontari e ragazzi del Servizio Civile garantiamo un servizio
            puntuale, gratuito e di qualità a tutta la comunità.
          </Text>
        </View>

        <View style={{ height: SPACING.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.surface },
  scroll: { paddingBottom: SPACING.xxxl },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    gap: SPACING.md,
  },
  headerLogo: { width: 48, height: 48 },
  brandTitle: { fontSize: 18, fontWeight: "700", color: COLORS.navy },
  brandSubtitle: { fontSize: 12, color: COLORS.onSurfaceMuted, marginTop: 2 },
  hero: {
    marginHorizontal: SPACING.lg,
    height: 240,
    borderRadius: RADIUS.lg,
    overflow: "hidden",
    ...SHADOW.card,
  },
  heroContent: { flex: 1, justifyContent: "flex-end", padding: SPACING.lg },
  heroEyebrow: { color: COLORS.brand, fontSize: 11, fontWeight: "700", letterSpacing: 1.2 },
  heroTitle: { color: COLORS.white, fontSize: 26, fontWeight: "800", marginTop: SPACING.xs, lineHeight: 32 },
  heroSub: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: SPACING.xs },
  heroCTA: {
    marginTop: SPACING.md,
    alignSelf: "flex-start",
    backgroundColor: COLORS.brand,
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  heroCTAText: { color: COLORS.white, fontWeight: "700", fontSize: 14 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.navy,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
  },
  servicesRow: { flexDirection: "row", paddingHorizontal: SPACING.lg, gap: SPACING.md },
  serviceCard: {
    flex: 1,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    ...SHADOW.card,
  },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.sm,
  },
  serviceTitle: { fontSize: 15, fontWeight: "700", color: COLORS.navy },
  serviceDesc: { fontSize: 12, color: COLORS.onSurfaceMuted, marginTop: 4, lineHeight: 17 },
  linksRow: { flexDirection: "row", paddingHorizontal: SPACING.lg, gap: SPACING.md },
  linkCard: {
    flex: 1,
    height: 130,
    borderRadius: RADIUS.md,
    overflow: "hidden",
    justifyContent: "flex-end",
    padding: SPACING.md,
    ...SHADOW.card,
  },
  linkLabel: { color: COLORS.white, fontWeight: "700", fontSize: 15 },
  aboutCard: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    ...SHADOW.card,
  },
  aboutTitle: { fontSize: 17, fontWeight: "700", color: COLORS.navy, marginBottom: SPACING.sm },
  aboutBody: { fontSize: 14, lineHeight: 22, color: COLORS.onSurface },
});
