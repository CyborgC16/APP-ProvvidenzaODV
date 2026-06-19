import { ScrollView, View, Text, StyleSheet, Pressable, Linking, FlatList, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS, SPACING, RADIUS, SHADOW, LOGO_URL, HERO_IMAGE, AMBULANCE_IMAGE, CIVIL_SERVICE_IMAGE, ABOUT_IMAGE, SERVICES_IMAGE } from "@/src/theme";
import { useI18n } from "@/src/i18n";
import LangToggle from "@/src/components/LangToggle";
import { api, GalleryPhoto } from "@/src/api";

const INSTAGRAM_URL = "https://www.instagram.com/la_provvidenza_anpas/";

export default function Home() {
  const router = useRouter();
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const listRef = useRef<FlatList<GalleryPhoto>>(null);
  const indexRef = useRef(0);

  useEffect(() => {
    api.listGallery().then(setPhotos).catch(() => {});
  }, []);

  // Auto-scroll carousel
  useEffect(() => {
    if (photos.length < 2) return;
    const interval = setInterval(() => {
      indexRef.current = (indexRef.current + 1) % photos.length;
      listRef.current?.scrollToIndex({ index: indexRef.current, animated: true });
    }, 3000);
    return () => clearInterval(interval);
  }, [photos.length]);

  const itemWidth = Math.min(width - SPACING.lg * 2, 320);
  const itemHeight = Math.round(itemWidth * 0.62);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]} testID="home-screen">
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Image source={{ uri: LOGO_URL }} style={styles.headerLogo} contentFit="contain" />
          <View style={{ flex: 1 }}>
            <Text style={styles.brandTitle}>La Provvidenza ODV</Text>
            <Text style={styles.brandSubtitle}>{t("app_subtitle")}</Text>
          </View>
          <LangToggle />
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
            <Text style={styles.heroEyebrow}>{t("hero_eyebrow")}</Text>
            <Text style={styles.heroTitle}>{t("hero_title")}</Text>
            <Text style={styles.heroSub}>{t("hero_sub")}</Text>
            <View style={styles.heroCTA} testID="home-cta-prenota">
              <Text style={styles.heroCTAText}>{t("hero_cta")}</Text>
              <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
            </View>
          </View>
        </Pressable>

        {/* Instagram banner */}
        <Pressable
          testID="instagram-link"
          onPress={() => Linking.openURL(INSTAGRAM_URL)}
          style={styles.instaCard}
        >
          <View style={styles.instaIcon}>
            <Ionicons name="logo-instagram" size={26} color={COLORS.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.instaTitle}>@la_provvidenza_anpas</Text>
            <Text style={styles.instaSubtitle}>{t("follow_instagram")}</Text>
          </View>
          <Ionicons name="open-outline" size={20} color={COLORS.navy} />
        </Pressable>

        {/* Services */}
        <Text style={styles.sectionTitle}>I Nostri Servizi</Text>
        <Pressable
          onPress={() => router.push("/(tabs)/prenota")}
          style={styles.servicesBanner}
          testID="services-banner"
        >
          <Image source={{ uri: SERVICES_IMAGE }} style={styles.servicesBannerImage} contentFit="contain" />
        </Pressable>
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
            style={[styles.linkCard, { backgroundColor: COLORS.white }]}
          >
            <Image source={{ uri: CIVIL_SERVICE_IMAGE }} style={styles.linkCardLogo} contentFit="contain" />
            <View style={styles.linkLabelBar}>
              <Text style={styles.linkLabel}>Servizio Civile</Text>
            </View>
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

        {/* Gallery from Admin */}
        {photos.length > 0 && (
          <View testID="home-gallery">
            <Text style={styles.sectionTitle}>{t("section_gallery")}</Text>
            <FlatList
              ref={listRef}
              data={photos}
              keyExtractor={(p) => p.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: SPACING.lg, gap: SPACING.md }}
              snapToInterval={itemWidth + SPACING.md}
              decelerationRate="fast"
              renderItem={({ item }) => (
                <View style={[styles.galleryCard, { width: itemWidth, height: itemHeight }]} testID={`gallery-${item.id}`}>
                  <Image source={{ uri: item.photo_b64 }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  {item.caption ? (
                    <LinearGradient
                      colors={["transparent", "rgba(0,0,0,0.75)"]}
                      style={[StyleSheet.absoluteFill, { top: undefined, height: 70 }]}
                    />
                  ) : null}
                  {item.caption ? <Text style={styles.galleryCaption} numberOfLines={2}>{item.caption}</Text> : null}
                </View>
              )}
              getItemLayout={(_, i) => ({ length: itemWidth + SPACING.md, offset: (itemWidth + SPACING.md) * i, index: i })}
            />
          </View>
        )}

        {/* About */}
        <View style={styles.aboutCard} testID="about-card">
          <Image source={{ uri: ABOUT_IMAGE }} style={styles.aboutImage} contentFit="contain" />
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
  linkCardLogo: { width: "100%", height: "100%", position: "absolute", top: 8, left: 0 },
  linkLabel: { color: COLORS.white, fontWeight: "700", fontSize: 15 },
  linkLabelBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.brand,
    paddingVertical: 8,
    alignItems: "center",
  },
  servicesBanner: {
    marginHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    overflow: "hidden",
    marginBottom: SPACING.md,
    backgroundColor: COLORS.surfaceSecondary,
    ...SHADOW.card,
  },
  servicesBannerImage: { width: "100%", aspectRatio: 1, backgroundColor: COLORS.surfaceSecondary },
  aboutCard: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.md,
    overflow: "hidden",
    ...SHADOW.card,
  },
  aboutImage: { width: "100%", aspectRatio: 1, backgroundColor: COLORS.surfaceSecondary },
  aboutTitle: { fontSize: 17, fontWeight: "700", color: COLORS.navy, marginBottom: SPACING.sm },
  aboutBody: { fontSize: 14, lineHeight: 22, color: COLORS.onSurface },
  galleryCard: {
    borderRadius: RADIUS.md,
    overflow: "hidden",
    backgroundColor: COLORS.surfaceTertiary,
    ...SHADOW.card,
  },
  galleryCaption: {
    position: "absolute",
    left: SPACING.md,
    right: SPACING.md,
    bottom: SPACING.md,
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "600",
  },
  instaCard: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.md,
    ...SHADOW.card,
  },
  instaIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E1306C",
  },
  instaTitle: { fontSize: 14, fontWeight: "700", color: COLORS.navy },
  instaSubtitle: { fontSize: 12, color: COLORS.onSurfaceMuted, marginTop: 2 },
});
