import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Linking, Platform, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS, RADIUS, SHADOW } from "@/src/theme";
import { useAuth } from "@/src/auth";
import { useI18n } from "@/src/i18n";

const WEBSITE_URL = "https://www.laprovvidenza.it/";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t } = useI18n();
  const isSC = user?.role === "servizio_civile";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.brand,
        tabBarInactiveTintColor: COLORS.onSurfaceMuted,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          position: Platform.OS === "web" ? "relative" : "absolute",
          backgroundColor: "rgba(255,255,255,0.98)",
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: 66 + Math.max(insets.bottom, 8),
          paddingTop: 7,
          paddingBottom: Math.max(insets.bottom, 8),
          ...(Platform.OS === "web" ? {} : {
            marginHorizontal: 12,
            marginBottom: 8,
            borderRadius: RADIUS.lg,
            ...SHADOW.floating,
          }),
        },
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: "700" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tab_home"),
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
          ...(Platform.OS === "web" ? {
            tabBarButton: ({ children, style, accessibilityState }) => (
              <Pressable
                style={style}
                accessibilityState={accessibilityState}
                onPress={() => Linking.openURL(WEBSITE_URL)}
                accessibilityLabel="Vai al sito La Provvidenza"
              >
                {children}
              </Pressable>
            ),
          } : {}),
        }}
      />
      <Tabs.Screen name="prenota" options={{ title: t("tab_prenota"), href: isSC ? null : "/(tabs)/prenota", tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} /> }} />
      <Tabs.Screen name="turni" options={{ title: t("tab_turni"), href: isSC ? "/(tabs)/turni" : null, tabBarIcon: ({ color, size }) => <Ionicons name="time" size={size} color={color} /> }} />
      <Tabs.Screen name="servizio-civile" options={{ title: t("tab_servizio_civile"), tabBarIcon: ({ color, size }) => <Ionicons name="heart" size={size} color={color} /> }} />
      <Tabs.Screen name="volontari" options={{ title: t("tab_volontari"), tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} /> }} />
      <Tabs.Screen name="account" options={{ title: t("tab_account"), tabBarIcon: ({ color, size }) => <Ionicons name="person-circle" size={size} color={color} /> }} />
    </Tabs>
  );
}
