import { useEffect, useRef } from "react";
import { StyleSheet, Text, Animated, Easing, Platform } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

import { COLORS, LOGO_URL, SPACING } from "@/src/theme";
import Landing from "@/src/components/Landing";

export default function Index() {
  // On web the app doubles as the public website (laprovvidenza.it).
  if (Platform.OS === "web") {
    return <Landing />;
  }
  return <Splash />;
}

function Splash() {
  const router = useRouter();
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    anim.start();
    const t = setTimeout(() => {
      router.replace("/(tabs)");
    }, 1700);
    return () => {
      clearTimeout(t);
      anim.stop();
    };
  }, [pulse, router]);

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] });
  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });

  return (
    <LinearGradient colors={[COLORS.cream, COLORS.surface]} style={styles.container} testID="splash-screen">
      <Animated.View style={[styles.logoWrap, { transform: [{ scale }], opacity }]}>
        <Image source={LOGO_URL} style={styles.logo} contentFit="contain" />
      </Animated.View>
      <Text style={styles.title} testID="splash-title">La Provvidenza ODV</Text>
      <Text style={styles.subtitle}>Pubblica Assistenza · Marsala</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: SPACING.xl },
  logoWrap: { width: 220, height: 220, alignItems: "center", justifyContent: "center" },
  logo: { width: "100%", height: "100%" },
  title: { marginTop: SPACING.xl, fontSize: 24, fontWeight: "700", color: COLORS.navy, letterSpacing: 0.5 },
  subtitle: { marginTop: SPACING.xs, fontSize: 14, color: COLORS.onSurfaceMuted },
});
