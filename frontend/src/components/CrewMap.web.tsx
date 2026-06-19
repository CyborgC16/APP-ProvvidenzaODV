import { View, Text, StyleSheet, Pressable, Linking } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, RADIUS, SHADOW } from "@/src/theme";

type Pos = {
  user_id: string;
  full_name: string;
  role: string;
  photo_b64?: string | null;
  latitude: number;
  longitude: number;
};

type Props = {
  positions: Pos[];
  myPos: { latitude: number; longitude: number } | null;
};

// Web fallback: list of positions with "open in maps" button
export default function CrewMap({ positions }: Props) {
  if (positions.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="navigate-outline" size={48} color={COLORS.onSurfaceMuted} />
        <Text style={styles.emptyText}>Nessuno online al momento.</Text>
        <Text style={styles.emptySub}>Attiva la posizione per condividere la tua con la crew.</Text>
      </View>
    );
  }
  return (
    <View style={{ padding: SPACING.lg }}>
      {positions.map((p) => (
        <View key={p.user_id} style={styles.row} testID={`crew-${p.user_id}`}>
          {p.photo_b64 ? (
            <Image source={{ uri: p.photo_b64 }} style={styles.avatar} contentFit="cover" />
          ) : (
            <View style={[styles.avatar, styles.avatarEmpty]}>
              <Text style={styles.avatarInitial}>{p.full_name.charAt(0)}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.rowName}>{p.full_name}</Text>
            <Text style={styles.rowMeta}>
              {p.role === "admin" || p.role === "master" ? "Volontario" : "Servizio Civile"}
              {" · "}
              {p.latitude.toFixed(4)}, {p.longitude.toFixed(4)}
            </Text>
          </View>
          <Pressable
            onPress={() =>
              Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${p.latitude},${p.longitude}`)
            }
            style={styles.mapBtn}
          >
            <Ionicons name="map" size={16} color={COLORS.white} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: "center", padding: SPACING.xxl, gap: SPACING.sm },
  emptyText: { fontSize: 14, fontWeight: "600", color: COLORS.navy, textAlign: "center", marginTop: SPACING.sm },
  emptySub: { fontSize: 12, color: COLORS.onSurfaceMuted, textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center", gap: SPACING.md, padding: SPACING.md, backgroundColor: COLORS.surfaceSecondary, borderRadius: RADIUS.md, marginBottom: SPACING.sm, ...SHADOW.card },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarEmpty: { backgroundColor: COLORS.brandLight, alignItems: "center", justifyContent: "center" },
  avatarInitial: { fontSize: 16, fontWeight: "800", color: COLORS.brand },
  rowName: { fontSize: 14, fontWeight: "700", color: COLORS.navy },
  rowMeta: { fontSize: 12, color: COLORS.onSurfaceMuted, marginTop: 2 },
  mapBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.brand, alignItems: "center", justifyContent: "center" },
});
