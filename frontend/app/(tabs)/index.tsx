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
import AnnouncementsBanner from "@/src/components/AnnouncementsBanner";
import { api, GalleryPhoto } from "@/src/api";

const INSTAGRAM_URL = "https://www.instagram.com/la_provvidenza_anpas/";
const ASSOCIATION_PHONE = "+393203920933";
const EMERGENCY_112 = "112";

export default function Home() {
  const router = useRouter();
  const { t } = useI18n();
  const { width, height } = useWindowDimensions();
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const listRef = useRef<FlatList<GalleryPhoto>>(null);
  const indexRef = useRef(0);

  useEffect(() => {
    api.listGallery().then(setPhotos).catch(() => {});
  }, []);

  useEffect(() => {
    if (photos.length < 2) return;
    const interval = setInterval(() => {
      indexRef.current = (indexRef.current + 1) % photos.length;
      listRef.current?.scrollToIndex({ index: indexRef.current, animated: true });
    }, 3500);
    return () => clearInterval(interval);
  }, [photos.length]);

  // Carousel item full-width edge-to-edge
  const itemWidth = width;
  const itemHeight = Math.round(itemWidth * 0.6);

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

        {/* Hero - full width edge-to-edge */}
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

        {/* Emergency + Chiamaci */}
        <View style={styles.emergencyRow}>
          <Pressable style={[styles.emergencyBtn, styles.emergencyRed]} onPress={() => Linking.openURL(`tel:${EMERGENCY_112}`)} testID="call-112">
            <Ionicons name="call" size={18} color={COLORS.white} />
            <Text style={styles.emergencyText}>112 · Emergenza</Text>
          </Pressable>
          <Pressable style={[styles.emergencyBtn, styles.emergencyBrand]} onPress={() => Linking.openURL(`tel:${ASSOCIATION_PHONE}`)} testID="call-assoc">
            <Ionicons name="call" size={18} color={COLORS.white} />
            <Text style={styles.emergencyText}>Chiamaci</Text>
          </Pressable>
        </View>

        {/* Announcements banner (only for logged-in users) */}
        <AnnouncementsBanner />

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

        {/* Services - full width banner edge-to-edge */}
        <Text style={styles.sectionTitle}>I Nostri Servizi</Text>
        <Pressable
          onPress={() => router.push("/(tabs)/prenota")}
          style={styles.fullBanner}
          testID="services-banner"
        >
          <Image source={{ uri: SERVICES_IMAGE }} style={styles.fullBannerImage} contentFit="cover" />
        </Pressable>

        {/* Services quick cards */}
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
            <Text style={styles.serviceTitle}>Trasporto Disabili</Text>
            <Text style={styles.serviceDesc}>Furgone attrezzato per trasporto carrozzine.</Text>
          </View>
        </View>

        {/* Conoscici - full width tiles */}
        <Text style={styles.sectionTitle}>Conoscici</Text>
        <Pressable
          testID="link-servizio-civile"
          onPress={() => router.push("/(tabs)/servizio-civile")}
          style={styles.conosciTile}
        >
          <Image source={{ uri: CIVIL_SERVICE_IMAGE }} style={styles.scuLogo} contentFit="contain" />
          <View style={styles.conosciLabel}>
            <Text style={styles.conosciLabelText}>Servizio Civile</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.white} />
          </View>
        </Pressable>
        <Pressable
          testID="link-volontari"
          onPress={() => router.push("/(tabs)/volontari")}
          style={styles.conosciTile}
        >
          <Image source={{ uri: AMBULANCE_IMAGE }} style={StyleSheet.absoluteFill} contentFit="cover" />
          <LinearGradient colors={["transparent", "rgba(0,0,0,0.75)"]} style={StyleSheet.absoluteFill} />
          <View style={[styles.conosciLabel, { backgroundColor: "transparent" }]}>
            <Text style={[styles.conosciLabelText, { color: COLORS.white }]}>I Nostri Volontari</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.white} />
          </View>
        </Pressable>

        {/* Gallery from Admin - full width edge-to-edge */}
        {photos.length > 0 && (
          <View testID="home-gallery">
            <Text style={styles.sectionTitle}>{t("section_gallery")}</Text>
            <FlatList
              ref={listRef}
              data={photos}
              keyExtractor={(p) => p.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              pagingEnabled
              snapToInterval={itemWidth}
              decelerationRate="fast"
              renderItem={({ item }) => (
                <View style={[styles.galleryItem, { width: itemWidth, height: itemHeight }]} testID={`gallery-${item.id}`}>
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
              getItemLayout={(_, i) => ({ length: itemWidth, offset: itemWidth * i, index: i })}
            />
          </View>
        )}

        {/* About - full screen portrait, edge-to-edge, no borders */}
        <View testID="about-card">
          <Image source={{ uri: ABOUT_IMAGE }} style={[styles.aboutImage, { width, height }]} contentFit="cover" />
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

  // Hero edge-to-edge
  hero: { height: 240, overflow: "hidden" },
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

  // Emergency numbers
  emergencyRow: { flexDirection: "row", gap: SPACING.sm, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md },
  emergencyBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: RADIUS.pill,
  },
  emergencyRed: { backgroundColor: "#DC3545" },
  emergencyBlue: { backgroundColor: "#0D6EFD" },
  emergencyBrand: { backgroundColor: COLORS.brand },
  emergencyText: { color: COLORS.white, fontWeight: "800", fontSize: 13 },

  // Instagram (kept as card)
  instaCard: {
    marginHorizontal: SPACING.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.surfaceSecondary,
    borderRadius: RADIUS.md,
    ...SHADOW.card,
  },
  instaIcon: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: "#E1306C" },
  instaTitle: { fontSize: 14, fontWeight: "700", color: COLORS.navy },
  instaSubtitle: { fontSize: 12, color: COLORS.onSurfaceMuted, marginTop: 2 },

  // Section titles
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.navy,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
  },

  // Full-width edge-to-edge banner
  fullBanner: { width: "100%", backgroundColor: COLORS.surfaceSecondary },
  fullBannerImage: { width: "100%", aspectRatio: 1 },

  // Service cards (small info cards, still bordered — visual balance)
  servicesRow: { flexDirection: "row", paddingHorizontal: SPACING.lg, gap: SPACING.md, marginTop: SPACING.md },
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

  // Conoscici full-width tiles
  conosciTile: {
    width: "100%",
    height: 200,
    backgroundColor: COLORS.white,
    justifyContent: "flex-end",
    marginBottom: 2,
    overflow: "hidden",
  },
  scuLogo: { width: "100%", height: "100%", padding: 20 },
  conosciLabel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: 12,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.brand,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  conosciLabelText: { color: COLORS.white, fontWeight: "800", fontSize: 16 },

  // Gallery edge-to-edge
  galleryItem: { overflow: "hidden", backgroundColor: COLORS.surfaceTertiary },
  galleryCaption: {
    position: "absolute",
    left: SPACING.md,
    right: SPACING.md,
    bottom: SPACING.md,
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "600",
  },

  // About edge-to-edge - full screen portrait, no borders
  aboutImage: { alignSelf: "center" },
});
