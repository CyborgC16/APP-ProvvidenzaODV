import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Animated,
  Easing,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { COLORS, SPACING, RADIUS, SHADOW, LOGO_URL, SITE_BG, ABOUT_IMAGE, HERO_IMAGE } from "@/src/theme";

/* ---------------- Phone mockups (app preview) ---------------- */
function PhoneMockup({ scale = 1 }: { scale?: number }) {
  const W = 240 * scale;
  const H = 500 * scale;
  return (
    <View style={{ width: W + 90 * scale, height: H + 40, alignItems: "center", justifyContent: "center" }}>
      {/* back phone */}
      <View
        style={[
          styles.phoneFrame,
          {
            width: W * 0.86,
            height: H * 0.86,
            position: "absolute",
            left: 0,
            top: 40,
            transform: [{ rotate: "-8deg" }],
            opacity: 0.92,
          },
        ]}
      >
        <Image source={HERO_IMAGE} style={styles.phoneScreen} contentFit="cover" />
      </View>
      {/* front phone */}
      <View
        style={[
          styles.phoneFrame,
          { width: W, height: H, position: "absolute", right: 0, top: 0, transform: [{ rotate: "4deg" }] },
        ]}
      >
        <View style={styles.notch} />
        <Image source={ABOUT_IMAGE} style={styles.phoneScreen} contentFit="cover" />
      </View>
    </View>
  );
}

function StoreBadge({ icon, top, bottom }: { icon: any; top: string; bottom: string }) {
  return (
    <View style={styles.storeBadge}>
      <Ionicons name={icon} size={24} color={COLORS.white} />
      <View>
        <Text style={styles.storeTop}>{top}</Text>
        <Text style={styles.storeBottom}>{bottom}</Text>
      </View>
    </View>
  );
}

/* ---------------- Landing ---------------- */
export default function Landing() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const isNarrow = width < 900;
  const heroW = width;
  const heroH = Math.min(Math.max(height - 64, 460), 760);

  const slide = useRef(new Animated.Value(0)).current;
  const [page, setPage] = useState(0);

  const goTo = (i: number) => {
    setPage(i);
    Animated.timing(slide, {
      toValue: i,
      duration: 750,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    const t = setTimeout(() => goTo(1), 3500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const translateX = slide.interpolate({ inputRange: [0, 1], outputRange: [0, -heroW] });

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ minHeight: height }} showsVerticalScrollIndicator={false}>
      {/* Top bar */}
      <View style={styles.topbar}>
        <Pressable style={styles.brand} onPress={() => goTo(0)}>
          <Image source={LOGO_URL} style={styles.logo} contentFit="contain" />
          <View>
            <Text style={styles.brandName}>La Provvidenza ODV</Text>
            <Text style={styles.brandSub}>Pubblica Assistenza · Marsala</Text>
          </View>
        </Pressable>

        <View style={styles.navRight}>
          {!isNarrow && (
            <>
              <Pressable onPress={() => router.push("/(tabs)/volontari")} style={styles.navLink}>
                <Text style={styles.navLinkText}>Volontari</Text>
              </Pressable>
              <Pressable onPress={() => router.push("/(tabs)/servizio-civile")} style={styles.navLink}>
                <Text style={styles.navLinkText}>Servizio Civile</Text>
              </Pressable>
            </>
          )}
          <Pressable onPress={() => router.push("/(tabs)/prenota")} style={styles.btnOutline} testID="site-prenota">
            <Ionicons name="calendar-outline" size={16} color={COLORS.brand} />
            <Text style={styles.btnOutlineText}>Prenota</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/(tabs)/account")} style={styles.btnLogin} testID="site-login">
            <Ionicons name="log-in-outline" size={16} color={COLORS.white} />
            <Text style={styles.btnLoginText}>Accedi</Text>
          </Pressable>
        </View>
      </View>

      {/* Hero slider */}
      <View style={[styles.heroClip, { width: heroW, height: heroH }]}>
        <Animated.View style={[styles.heroRow, { width: heroW * 2, height: heroH, transform: [{ translateX }] }]}>
          {/* Panel A - ambulance */}
          <View style={{ width: heroW, height: heroH }}>
            <Image source={{ uri: SITE_BG }} style={styles.heroImg} contentFit="cover" />
            <LinearGradient
              colors={["rgba(10,16,26,0.15)", "rgba(10,16,26,0.55)", "rgba(10,16,26,0.85)"]}
              style={styles.heroOverlay}
            />
            <View style={[styles.heroContent, { paddingHorizontal: isNarrow ? SPACING.xl : 72 }]}>
              <View style={styles.badge}>
                <View style={styles.badgeDot} />
                <Text style={styles.badgeText}>Emergenza sanitaria · 24 ore su 24</Text>
              </View>
              <Text style={[styles.heroTitle, { fontSize: isNarrow ? 34 : 56 }]}>
                Al servizio della{"\n"}
                <Text style={{ color: COLORS.brand }}>nostra comunità</Text>
              </Text>
              <Text style={styles.heroSubtitle}>
                Soccorso, trasporto sanitario e trasporto disabili a Marsala. Volontari sempre pronti,
                con professionalità e cuore.
              </Text>
              <View style={styles.heroCtas}>
                <Pressable onPress={() => router.push("/(tabs)/prenota")} style={styles.ctaPrimary} testID="hero-prenota">
                  <Ionicons name="calendar" size={18} color={COLORS.white} />
                  <Text style={styles.ctaPrimaryText}>Prenota un servizio</Text>
                </Pressable>
                <Pressable onPress={() => goTo(1)} style={styles.ctaGhost}>
                  <Text style={styles.ctaGhostText}>Scopri la nuova App</Text>
                  <Ionicons name="arrow-forward" size={16} color={COLORS.white} />
                </Pressable>
              </View>
            </View>
          </View>

          {/* Panel B - app promo */}
          <View style={{ width: heroW, height: heroH }}>
            <LinearGradient colors={[COLORS.navy, "#0E2136"]} style={StyleSheet.absoluteFill} />
            <View
              style={[
                styles.promoWrap,
                { flexDirection: isNarrow ? "column" : "row", paddingHorizontal: isNarrow ? SPACING.xl : 72 },
              ]}
            >
              <View style={[styles.promoText, { alignItems: isNarrow ? "center" : "flex-start" }]}>
                <View style={styles.badge}>
                  <Ionicons name="phone-portrait" size={13} color={COLORS.white} />
                  <Text style={styles.badgeText}>Presto su iOS e Android</Text>
                </View>
                <Text
                  style={[styles.promoTitle, { fontSize: isNarrow ? 30 : 48, textAlign: isNarrow ? "center" : "left" }]}
                >
                  È arrivata la nostra <Text style={{ color: COLORS.brand }}>App</Text>
                </Text>
                <Text style={[styles.promoSub, { textAlign: isNarrow ? "center" : "left" }]}>
                  Prenota ambulanze e trasporto disabili dal telefono, consulta i turni e resta aggiornato
                  sulle attività dell&apos;associazione.
                </Text>
                <View style={styles.storeRow}>
                  <StoreBadge icon="logo-apple" top="Presto disponibile su" bottom="App Store" />
                  <StoreBadge icon="logo-google-playstore" top="Presto disponibile su" bottom="Google Play" />
                </View>
                <Pressable onPress={() => router.push("/(tabs)")} style={styles.webAppBtn} testID="use-web-app">
                  <Ionicons name="globe-outline" size={16} color={COLORS.brand} />
                  <Text style={styles.webAppText}>Usa subito l&apos;app web</Text>
                </Pressable>
              </View>
              {!isNarrow && (
                <View style={styles.promoPhone}>
                  <PhoneMockup scale={1} />
                </View>
              )}
            </View>
          </View>
        </Animated.View>

        {/* controls */}
        <View style={styles.dots}>
          <Pressable onPress={() => goTo(0)} hitSlop={10}>
            <View style={[styles.dot, page === 0 && styles.dotActive]} />
          </Pressable>
          <Pressable onPress={() => goTo(1)} hitSlop={10}>
            <View style={[styles.dot, page === 1 && styles.dotActive]} />
          </Pressable>
        </View>
        <Pressable style={[styles.arrow, styles.arrowLeft]} onPress={() => goTo(0)} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={COLORS.white} />
        </Pressable>
        <Pressable style={[styles.arrow, styles.arrowRight]} onPress={() => goTo(1)} hitSlop={8}>
          <Ionicons name="chevron-forward" size={22} color={COLORS.white} />
        </Pressable>
      </View>

      {/* Services */}
      <View style={styles.section}>
        <Text style={styles.sectionKicker}>I NOSTRI SERVIZI</Text>
        <Text style={styles.sectionTitle}>Cosa possiamo fare per te</Text>
        <View style={[styles.cardsRow, { flexDirection: isNarrow ? "column" : "row" }]}>
          <ServiceCard
            icon="medical"
            title="Ambulanza"
            desc="Trasporto sanitario e assistenza per visite, dimissioni e necessità mediche."
          />
          <ServiceCard
            icon="accessibility"
            title="Trasporto Disabili"
            desc="Mezzi attrezzati per chi viaggia in carrozzina, con personale dedicato."
          />
          <ServiceCard
            icon="heart"
            title="Servizio Civile"
            desc="Giovani volontari al servizio della comunità in progetti di solidarietà."
          />
        </View>

        <View style={[styles.finalCta, { flexDirection: isNarrow ? "column" : "row" }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.finalCtaTitle}>Hai bisogno di un servizio?</Text>
            <Text style={styles.finalCtaSub}>
              Prenota online in pochi passaggi. Ti ricontatteremo per confermare la disponibilità.
            </Text>
          </View>
          <Pressable onPress={() => router.push("/(tabs)/prenota")} style={styles.finalCtaBtn} testID="final-prenota">
            <Text style={styles.finalCtaBtnText}>Prenota ora</Text>
            <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
          </Pressable>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerBrand}>La Provvidenza ODV</Text>
        <Text style={styles.footerText}>Pubblica Assistenza · Marsala (TP)</Text>
        <Text style={styles.footerText}>info@laprovvidenza.it</Text>
        <View style={styles.footerLinks}>
          <Pressable onPress={() => router.push("/legal/privacy")}>
            <Text style={styles.footerLink}>Privacy</Text>
          </Pressable>
          <Text style={styles.footerText}>·</Text>
          <Pressable onPress={() => router.push("/legal/terms")}>
            <Text style={styles.footerLink}>Termini</Text>
          </Pressable>
          <Text style={styles.footerText}>·</Text>
          <Pressable onPress={() => router.push("/(tabs)/account")}>
            <Text style={styles.footerLink}>Area Riservata</Text>
          </Pressable>
        </View>
        <Text style={styles.footerCopy}>© {new Date().getFullYear()} La Provvidenza ODV. Tutti i diritti riservati.</Text>
      </View>
    </ScrollView>
  );
}

function ServiceCard({ icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardIcon}>
        <Ionicons name={icon} size={26} color={COLORS.brand} />
      </View>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDesc}>{desc}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.surface },
  // topbar
  topbar: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.xl,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    zIndex: 10,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: SPACING.sm },
  logo: { width: 40, height: 40 },
  brandName: { fontSize: 16, fontWeight: "800", color: COLORS.navy },
  brandSub: { fontSize: 11, color: COLORS.onSurfaceMuted },
  navRight: { flexDirection: "row", alignItems: "center", gap: SPACING.md },
  navLink: { paddingHorizontal: SPACING.sm, paddingVertical: 8 },
  navLinkText: { fontSize: 14, fontWeight: "600", color: COLORS.navy },
  btnOutline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    borderColor: COLORS.brand,
  },
  btnOutlineText: { color: COLORS.brand, fontWeight: "700", fontSize: 14 },
  btnLogin: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.brand,
  },
  btnLoginText: { color: COLORS.white, fontWeight: "700", fontSize: 14 },
  // hero
  heroClip: { overflow: "hidden", backgroundColor: COLORS.navy },
  heroRow: { flexDirection: "row" },
  heroImg: { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  heroOverlay: { ...StyleSheet.absoluteFillObject },
  heroContent: { flex: 1, justifyContent: "center", maxWidth: 820 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: RADIUS.pill,
    marginBottom: SPACING.lg,
  },
  badgeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.brand },
  badgeText: { color: COLORS.white, fontSize: 12, fontWeight: "700" },
  heroTitle: { color: COLORS.white, fontWeight: "900", lineHeight: undefined, marginBottom: SPACING.md },
  heroSubtitle: { color: "rgba(255,255,255,0.85)", fontSize: 16, lineHeight: 24, maxWidth: 560, marginBottom: SPACING.xl },
  heroCtas: { flexDirection: "row", alignItems: "center", gap: SPACING.md, flexWrap: "wrap" },
  ctaPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.brand,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: RADIUS.pill,
    ...SHADOW.card,
  },
  ctaPrimaryText: { color: COLORS.white, fontWeight: "800", fontSize: 15 },
  ctaGhost: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 14 },
  ctaGhostText: { color: COLORS.white, fontWeight: "700", fontSize: 15 },
  // promo
  promoWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: SPACING.xxl },
  promoText: { flex: 1, maxWidth: 620, justifyContent: "center" },
  promoTitle: { color: COLORS.white, fontWeight: "900", marginBottom: SPACING.md },
  promoSub: { color: "rgba(255,255,255,0.8)", fontSize: 16, lineHeight: 24, marginBottom: SPACING.xl, maxWidth: 520 },
  storeRow: { flexDirection: "row", gap: SPACING.md, marginBottom: SPACING.lg, flexWrap: "wrap" },
  storeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  storeTop: { color: "rgba(255,255,255,0.7)", fontSize: 10 },
  storeBottom: { color: COLORS.white, fontSize: 16, fontWeight: "800" },
  webAppBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: COLORS.white,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: RADIUS.pill,
  },
  webAppText: { color: COLORS.brand, fontWeight: "800", fontSize: 14 },
  promoPhone: { alignItems: "center", justifyContent: "center" },
  // phone
  phoneFrame: {
    backgroundColor: "#0B0B0F",
    borderRadius: 36,
    padding: 8,
    borderWidth: 2,
    borderColor: "#22232B",
    overflow: "hidden",
    ...SHADOW.card,
  },
  phoneScreen: { flex: 1, borderRadius: 28, backgroundColor: COLORS.white },
  notch: {
    position: "absolute",
    top: 8,
    alignSelf: "center",
    width: 90,
    height: 20,
    backgroundColor: "#0B0B0F",
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    zIndex: 2,
  },
  // controls
  dots: { position: "absolute", bottom: 18, alignSelf: "center", flexDirection: "row", gap: 8 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.4)" },
  dotActive: { backgroundColor: COLORS.brand, width: 22 },
  arrow: {
    position: "absolute",
    top: "50%",
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  arrowLeft: { left: 14 },
  arrowRight: { right: 14 },
  // section
  section: { paddingHorizontal: SPACING.xl, paddingVertical: 56, maxWidth: 1200, alignSelf: "center", width: "100%" },
  sectionKicker: { color: COLORS.brand, fontWeight: "800", fontSize: 13, letterSpacing: 1, textAlign: "center" },
  sectionTitle: { color: COLORS.navy, fontWeight: "900", fontSize: 30, textAlign: "center", marginTop: 6, marginBottom: SPACING.xl },
  cardsRow: { gap: SPACING.lg, justifyContent: "center" },
  card: {
    flex: 1,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOW.card,
  },
  cardIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: COLORS.brandLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
  },
  cardTitle: { color: COLORS.navy, fontWeight: "800", fontSize: 18, marginBottom: 6 },
  cardDesc: { color: COLORS.onSurfaceMuted, fontSize: 14, lineHeight: 21 },
  finalCta: {
    marginTop: 48,
    backgroundColor: COLORS.navy,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: "center",
    gap: SPACING.lg,
  },
  finalCtaTitle: { color: COLORS.white, fontWeight: "900", fontSize: 24 },
  finalCtaSub: { color: "rgba(255,255,255,0.8)", fontSize: 15, marginTop: 6, maxWidth: 560 },
  finalCtaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.brand,
    paddingHorizontal: 28,
    paddingVertical: 15,
    borderRadius: RADIUS.pill,
  },
  finalCtaBtnText: { color: COLORS.white, fontWeight: "800", fontSize: 16 },
  // footer
  footer: { backgroundColor: COLORS.cream, paddingVertical: 40, paddingHorizontal: SPACING.xl, alignItems: "center", gap: 4, borderTopWidth: 1, borderTopColor: COLORS.border },
  footerBrand: { color: COLORS.navy, fontWeight: "900", fontSize: 18 },
  footerText: { color: COLORS.onSurfaceMuted, fontSize: 13 },
  footerLinks: { flexDirection: "row", alignItems: "center", gap: SPACING.sm, marginTop: SPACING.sm },
  footerLink: { color: COLORS.brand, fontWeight: "700", fontSize: 13 },
  footerCopy: { color: COLORS.onSurfaceMuted, fontSize: 12, marginTop: SPACING.md },
});
