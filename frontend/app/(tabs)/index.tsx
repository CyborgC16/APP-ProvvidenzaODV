import { Animated, View, Text, StyleSheet, Pressable, Linking, FlatList, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";

import { COLORS, SPACING, RADIUS, SHADOW, LOGO_URL, HERO_IMAGE, AMBULANCE_IMAGE, CIVIL_SERVICE_IMAGE } from "@/src/theme";
import { useI18n } from "@/src/i18n";
import LangToggle from "@/src/components/LangToggle";
import AnnouncementsBanner from "@/src/components/AnnouncementsBanner";
import { api, GalleryPhoto } from "@/src/api";

const INSTAGRAM_URL = "https://www.instagram.com/la_provvidenza_anpas/";
const ASSOCIATION_PHONE = "+393203920933";
const AnimatedImage = Animated.createAnimatedComponent(Image);

export default function Home() {
  const router = useRouter();
  const { t } = useI18n();
  const { width } = useWindowDimensions();
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const listRef = useRef<FlatList<GalleryPhoto>>(null);
  const indexRef = useRef(0);
  const scrollY = useRef(new Animated.Value(0)).current;
  const contentWidth = Math.min(width, 1180);
  const galleryWidth = Math.min(width - 32, 760);

  useEffect(() => { api.listGallery().then(setPhotos).catch(() => {}); }, []);
  useEffect(() => {
    if (photos.length < 2) return;
    const timer = setInterval(() => {
      indexRef.current = (indexRef.current + 1) % photos.length;
      listRef.current?.scrollToIndex({ index: indexRef.current, animated: true });
    }, 4000);
    return () => clearInterval(timer);
  }, [photos.length]);


  const heroImageTranslateY = scrollY.interpolate({
    inputRange: [0, 420],
    outputRange: [0, 105],
    extrapolate: "clamp",
  });
  const heroImageScale = scrollY.interpolate({
    inputRange: [0, 420],
    outputRange: [1.08, 1.22],
    extrapolate: "clamp",
  });
  const heroContentTranslateY = scrollY.interpolate({
    inputRange: [0, 280],
    outputRange: [0, -34],
    extrapolate: "clamp",
  });
  const heroContentOpacity = scrollY.interpolate({
    inputRange: [0, 220, 380],
    outputRange: [1, 0.94, 0.35],
    extrapolate: "clamp",
  });
  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, 90],
    outputRange: [0, -8],
    extrapolate: "clamp",
  });

  const actions = [
    { title: "Prenota un trasporto", subtitle: "Richiedi un servizio in pochi passaggi", icon: "calendar-outline" as const, onPress: () => router.push("/(tabs)/prenota") },
    { title: "I nostri volontari", subtitle: "Scopri la squadra", icon: "people-outline" as const, onPress: () => router.push("/(tabs)/volontari") },
    { title: "Servizio Civile", subtitle: "Informazioni e opportunità", icon: "heart-outline" as const, onPress: () => router.push("/(tabs)/servizio-civile") },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]} testID="home-screen">
      <Animated.ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
      >
        <View style={[styles.container, { width: contentWidth }]}> 
          <Animated.View style={[styles.header, { transform: [{ translateY: headerTranslateY }] }]}>
            <View style={styles.brandWrap}>
              <Image source={LOGO_URL} style={styles.logo} contentFit="contain" />
              <View style={{ flex: 1 }}><Text style={styles.brand}>La Provvidenza</Text><Text style={styles.subtitle}>Organizzazione di Volontariato</Text></View>
            </View>
            <LangToggle />
          </Animated.View>

          <Pressable onPress={() => router.push("/(tabs)/prenota")} style={({ pressed }) => [styles.hero, pressed && styles.pressed]}>
            <AnimatedImage
              source={HERO_IMAGE}
              style={[StyleSheet.absoluteFill, { transform: [{ translateY: heroImageTranslateY }, { scale: heroImageScale }] }]}
              contentFit="cover"
            />
            <LinearGradient colors={["rgba(10,24,42,0.05)", "rgba(10,24,42,0.88)"]} style={StyleSheet.absoluteFill} />
            <Animated.View style={[styles.heroContent, { opacity: heroContentOpacity, transform: [{ translateY: heroContentTranslateY }] }]}>
              <View style={styles.badge}><Ionicons name="shield-checkmark" size={14} color={COLORS.brand} /><Text style={styles.badgeText}>AL SERVIZIO DELLA COMUNITÀ</Text></View>
              <Text style={styles.heroTitle}>Vicini alle persone, ogni giorno.</Text>
              <Text style={styles.heroSub}>Trasporto sanitario, assistenza e volontariato con professionalità e umanità.</Text>
              <View style={styles.primaryButton}><Text style={styles.primaryButtonText}>Prenota un servizio</Text><Ionicons name="arrow-forward" size={19} color={COLORS.white} /></View>
            </Animated.View>
            <View style={styles.heroGlowOne} />
            <View style={styles.heroGlowTwo} />
          </Pressable>

          <View style={styles.contactRow}>
            <Pressable style={[styles.contactButton, styles.emergency]} onPress={() => Linking.openURL("tel:112")}><Ionicons name="call" size={20} color={COLORS.white} /><View><Text style={styles.contactSmall}>EMERGENZE</Text><Text style={styles.contactStrong}>Chiama il 112</Text></View></Pressable>
            <Pressable style={[styles.contactButton, styles.callUs]} onPress={() => Linking.openURL(`tel:${ASSOCIATION_PHONE}`)}><Ionicons name="headset" size={20} color={COLORS.brand} /><View><Text style={[styles.contactSmall, { color: COLORS.onSurfaceMuted }]}>INFORMAZIONI</Text><Text style={[styles.contactStrong, { color: COLORS.navy }]}>Contatta la sede</Text></View></Pressable>
          </View>

          <AnnouncementsBanner />

          <View style={styles.sectionHeader}><View><Text style={styles.kicker}>ACCESSO RAPIDO</Text><Text style={styles.sectionTitle}>Cosa possiamo fare per te</Text></View></View>
          <View style={styles.actionGrid}>{actions.map((a) => <Pressable key={a.title} onPress={a.onPress} style={({ pressed }) => [styles.actionCard, pressed && styles.pressed]}><View style={styles.actionIcon}><Ionicons name={a.icon} size={25} color={COLORS.brand} /></View><Text style={styles.actionTitle}>{a.title}</Text><Text style={styles.actionSub}>{a.subtitle}</Text><Ionicons name="arrow-forward-circle" size={25} color={COLORS.navy} style={styles.actionArrow} /></Pressable>)}</View>

          <View style={styles.sectionHeader}><View><Text style={styles.kicker}>CHI SIAMO</Text><Text style={styles.sectionTitle}>Una comunità che si prende cura</Text></View></View>
          <View style={styles.featureRow}>
            <Pressable style={styles.featureCard} onPress={() => router.push("/(tabs)/volontari")}><Image source={AMBULANCE_IMAGE} style={StyleSheet.absoluteFill} contentFit="cover" /><LinearGradient colors={["transparent", "rgba(8,20,35,.9)"]} style={StyleSheet.absoluteFill} /><View style={styles.featureLabel}><Text style={styles.featureTitle}>Volontari</Text><Text style={styles.featureSub}>Persone, competenze e passione</Text></View></Pressable>
            <Pressable style={styles.featureCard} onPress={() => router.push("/(tabs)/servizio-civile")}><Image source={CIVIL_SERVICE_IMAGE} style={StyleSheet.absoluteFill} contentFit="cover" /><LinearGradient colors={["transparent", "rgba(8,20,35,.9)"]} style={StyleSheet.absoluteFill} /><View style={styles.featureLabel}><Text style={styles.featureTitle}>Servizio Civile</Text><Text style={styles.featureSub}>Crescere aiutando gli altri</Text></View></Pressable>
          </View>

          <Pressable onPress={() => Linking.openURL(INSTAGRAM_URL)} style={styles.socialCard}><View style={styles.socialIcon}><Ionicons name="logo-instagram" size={25} color={COLORS.white} /></View><View style={{ flex: 1 }}><Text style={styles.socialTitle}>Seguici su Instagram</Text><Text style={styles.socialSub}>@la_provvidenza_anpas</Text></View><Ionicons name="open-outline" size={22} color={COLORS.navy} /></Pressable>

          {photos.length > 0 && <View><View style={styles.sectionHeader}><View><Text style={styles.kicker}>DALLE NOSTRE ATTIVITÀ</Text><Text style={styles.sectionTitle}>{t("section_gallery")}</Text></View></View><FlatList ref={listRef} data={photos} horizontal pagingEnabled showsHorizontalScrollIndicator={false} keyExtractor={(p) => p.id} snapToInterval={galleryWidth + 12} decelerationRate="fast" renderItem={({ item }) => <View style={[styles.gallery, { width: galleryWidth }]}><Image source={{ uri: item.photo_b64 }} style={StyleSheet.absoluteFill} contentFit="cover" />{item.caption ? <LinearGradient colors={["transparent", "rgba(0,0,0,.78)"]} style={StyleSheet.absoluteFill} /> : null}{item.caption ? <Text style={styles.galleryCaption}>{item.caption}</Text> : null}</View>} getItemLayout={(_, i) => ({ length: galleryWidth + 12, offset: (galleryWidth + 12) * i, index: i })} ItemSeparatorComponent={() => <View style={{ width: 12 }} />} /></View>}
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.surface }, scroll: { paddingBottom: 110 }, container: { alignSelf: "center", paddingHorizontal: 16 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14 }, brandWrap: { flexDirection: "row", alignItems: "center", flex: 1, gap: 11 }, logo: { width: 48, height: 48 }, brand: { fontSize: 20, fontWeight: "900", color: COLORS.navy, letterSpacing: -.4 }, subtitle: { fontSize: 11.5, color: COLORS.onSurfaceMuted, marginTop: 1 },
  hero: { minHeight: 430, borderRadius: 30, overflow: "hidden", justifyContent: "flex-end", backgroundColor: COLORS.navyDark, ...SHADOW.floating }, heroContent: { padding: 28, maxWidth: 650, zIndex: 3 }, badge: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,.94)", paddingHorizontal: 10, paddingVertical: 7, borderRadius: RADIUS.pill }, badgeText: { color: COLORS.navy, fontSize: 10, fontWeight: "900", letterSpacing: .8 }, heroTitle: { color: COLORS.white, fontSize: 34, lineHeight: 39, fontWeight: "900", marginTop: 14, letterSpacing: -.8 }, heroSub: { color: "rgba(255,255,255,.88)", fontSize: 15, lineHeight: 22, marginTop: 8 }, primaryButton: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: COLORS.brand, paddingHorizontal: 18, paddingVertical: 13, borderRadius: RADIUS.pill, marginTop: 18 }, primaryButtonText: { color: COLORS.white, fontSize: 14, fontWeight: "900" },
  heroGlowOne: { position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(255,107,0,.18)", top: -65, right: -40, zIndex: 2 },
  heroGlowTwo: { position: "absolute", width: 110, height: 110, borderRadius: 55, backgroundColor: "rgba(255,255,255,.10)", bottom: 34, right: 28, zIndex: 2 },
  contactRow: { flexDirection: "row", gap: 12, marginTop: 14 }, contactButton: { flex: 1, minHeight: 72, borderRadius: 18, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 11 }, emergency: { backgroundColor: COLORS.error }, callUs: { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border, ...SHADOW.card }, contactSmall: { color: "rgba(255,255,255,.8)", fontSize: 9, fontWeight: "800", letterSpacing: .8 }, contactStrong: { color: COLORS.white, fontSize: 14, fontWeight: "900", marginTop: 2 },
  sectionHeader: { marginTop: 30, marginBottom: 14 }, kicker: { color: COLORS.brand, fontWeight: "900", fontSize: 10, letterSpacing: 1.2 }, sectionTitle: { color: COLORS.navy, fontWeight: "900", fontSize: 24, letterSpacing: -.5, marginTop: 3 }, actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 }, actionCard: { flexGrow: 1, flexBasis: 210, minHeight: 172, backgroundColor: COLORS.white, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border, padding: 18, ...SHADOW.card }, actionIcon: { width: 48, height: 48, borderRadius: 15, backgroundColor: COLORS.brandLight, alignItems: "center", justifyContent: "center" }, actionTitle: { color: COLORS.navy, fontWeight: "900", fontSize: 16, marginTop: 16 }, actionSub: { color: COLORS.onSurfaceMuted, fontSize: 12.5, lineHeight: 18, marginTop: 4, paddingRight: 30 }, actionArrow: { position: "absolute", right: 16, bottom: 16 },
  featureRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 }, featureCard: { flexGrow: 1, flexBasis: 280, height: 250, borderRadius: 22, overflow: "hidden", justifyContent: "flex-end", ...SHADOW.card }, featureLabel: { padding: 20 }, featureTitle: { color: COLORS.white, fontSize: 22, fontWeight: "900" }, featureSub: { color: "rgba(255,255,255,.82)", fontSize: 13, marginTop: 3 },
  socialCard: { marginTop: 26, flexDirection: "row", alignItems: "center", gap: 13, padding: 16, borderRadius: 18, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border }, socialIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: "#D62976", alignItems: "center", justifyContent: "center" }, socialTitle: { color: COLORS.navy, fontSize: 15, fontWeight: "900" }, socialSub: { color: COLORS.onSurfaceMuted, fontSize: 12, marginTop: 2 },
  gallery: { height: 360, borderRadius: 22, overflow: "hidden", justifyContent: "flex-end" }, galleryCaption: { color: COLORS.white, fontWeight: "800", fontSize: 15, padding: 18 }, pressed: { opacity: .9, transform: [{ scale: .99 }] },
});
