import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";

import { COLORS, SITE_BG } from "@/src/theme";

/**
 * Native fallback for the web-only scroll-scrubbed video hero.
 * The Landing page is rendered on web only, so this is never displayed on
 * device; it exists so Metro can resolve the import when bundling for native.
 */
export default function HeroVideo() {
  return (
    <View style={styles.wrap}>
      <Image source={{ uri: SITE_BG }} style={StyleSheet.absoluteFill} contentFit="cover" />
      <View style={styles.overlay} />
      <Text style={styles.title}>La Provvidenza ODV</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 480, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.navy },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(10,16,26,0.45)" },
  title: { color: "#fff", fontSize: 28, fontWeight: "900" },
});
