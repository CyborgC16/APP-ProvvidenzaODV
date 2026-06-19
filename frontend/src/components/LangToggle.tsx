import { View, Text, StyleSheet, Pressable } from "react-native";
import { useI18n } from "@/src/i18n";
import { COLORS, RADIUS } from "@/src/theme";

export default function LangToggle({ testID }: { testID?: string }) {
  const { lang, setLang } = useI18n();
  return (
    <View style={styles.wrap} testID={testID || "lang-toggle"}>
      <Pressable
        testID="lang-it"
        onPress={() => setLang("it")}
        style={[styles.btn, lang === "it" && styles.btnActive]}
      >
        <Text style={styles.flag}>🇮🇹</Text>
      </Pressable>
      <Pressable
        testID="lang-en"
        onPress={() => setLang("en")}
        style={[styles.btn, lang === "en" && styles.btnActive]}
      >
        <Text style={styles.flag}>🇬🇧</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", gap: 4, backgroundColor: COLORS.surfaceTertiary, borderRadius: RADIUS.pill, padding: 3 },
  btn: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.pill },
  btnActive: { backgroundColor: COLORS.white, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  flag: { fontSize: 18 },
});
