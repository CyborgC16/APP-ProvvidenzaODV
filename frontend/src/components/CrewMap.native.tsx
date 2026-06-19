import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import MapView, { Marker } from "react-native-maps";
import { COLORS, RADIUS } from "@/src/theme";

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

export default function CrewMap({ positions, myPos }: Props) {
  const region = myPos
    ? { latitude: myPos.latitude, longitude: myPos.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 }
    : { latitude: 37.7986, longitude: 12.4361, latitudeDelta: 0.1, longitudeDelta: 0.1 }; // Marsala

  return (
    <MapView style={{ flex: 1 }} region={region} showsUserLocation testID="crew-map">
      {positions.map((p) => (
        <Marker key={p.user_id} coordinate={{ latitude: p.latitude, longitude: p.longitude }} testID={`marker-${p.user_id}`}>
          <View style={styles.markerWrap}>
            {p.photo_b64 ? (
              <Image source={{ uri: p.photo_b64 }} style={styles.markerPhoto} contentFit="cover" />
            ) : (
              <View style={[styles.markerPhoto, styles.empty]}>
                <Text style={styles.initial}>{p.full_name.charAt(0)}</Text>
              </View>
            )}
          </View>
        </Marker>
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  markerWrap: { padding: 3, backgroundColor: COLORS.white, borderRadius: 999, borderWidth: 2, borderColor: COLORS.brand },
  markerPhoto: { width: 36, height: 36, borderRadius: 18 },
  empty: { backgroundColor: COLORS.brandLight, alignItems: "center", justifyContent: "center" },
  initial: { fontSize: 14, fontWeight: "800", color: COLORS.brand },
});
