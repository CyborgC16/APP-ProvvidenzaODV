import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";

/**
 * Open image picker, return base64 data URI (~600px, compressed).
 * Returns null if cancelled.
 */
export async function pickImageBase64(): Promise<string | null> {
  if (Platform.OS !== "web") {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.5,
    base64: true,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  if (asset.base64) {
    const mime = asset.mimeType || "image/jpeg";
    return `data:${mime};base64,${asset.base64}`;
  }
  return null;
}
