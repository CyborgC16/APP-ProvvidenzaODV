import React from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { Image } from "expo-image";
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from "react-native-maps";
import CrewMapFallback from "./CrewMap.web";
import { COLORS } from "@/src/theme";

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

// Marsala, Italy fallback center
const FALLBACK_REGION = {
  latitude: 37.7989,
  longitude: 12.4366,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

// Crash-safe Map: if MapView fails (missing Google Play services etc),
// fall back to a list (CrewMap.web).
class MapErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: any) {
    console.warn("[CrewMap] native map crashed, using fallback:", err);
  }
  render() {
    if (this.state.hasError) return this.props.fallback as any;
    return this.props.children as any;
  }
}

function CrewMapInner({ positions, myPos }: Props) {
  const initialRegion = myPos
    ? { latitude: myPos.latitude, longitude: myPos.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 }
    : positions.length > 0
    ? { latitude: positions[0].latitude, longitude: positions[0].longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 }
    : FALLBACK_REGION;

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={Platform.OS === "android" ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        initialRegion={initialRegion}
        showsUserLocation
        showsMyLocationButton
        loadingEnabled
        loadingIndicatorColor={COLORS.brand}
      >
        {positions.map((p) => (
          <Marker
            key={p.user_id}
            coordinate={{ latitude: p.latitude, longitude: p.longitude }}
            title={p.full_name}
            description={p.role === "admin" || p.role === "master" ? "Volontario" : "Servizio Civile"}
            testID={`marker-${p.user_id}`}
          >
            <View style={styles.markerWrap}>
              <View style={styles.markerPin}>
                {p.photo_b64 ? (
                  <Image source={{ uri: p.photo_b64 }} style={styles.markerAvatar} contentFit="cover" />
                ) : (
                  <View style={[styles.markerAvatar, styles.markerEmpty]}>
                    <Text style={styles.markerInitial}>{p.full_name.charAt(0)}</Text>
                  </View>
                )}
              </View>
              <View style={styles.markerTriangle} />
            </View>
          </Marker>
        ))}
      </MapView>
    </View>
  );
}

// Lazy import the web fallback so the bundle stays small when the map works.

export default function CrewMap(props: Props) {
  return (
    <MapErrorBoundary fallback={<CrewMapFallback {...props} />}>
      <CrewMapInner {...props} />
    </MapErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  markerWrap: { alignItems: "center" },
  markerPin: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.white,
    borderWidth: 3,
    borderColor: COLORS.brand,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  markerAvatar: { width: 38, height: 38, borderRadius: 19 },
  markerEmpty: { backgroundColor: COLORS.brandLight, alignItems: "center", justifyContent: "center" },
  markerInitial: { fontSize: 16, fontWeight: "800", color: COLORS.brand },
  markerTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: COLORS.brand,
    marginTop: -2,
  },
});
