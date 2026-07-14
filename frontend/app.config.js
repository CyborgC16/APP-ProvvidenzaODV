const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || "";

module.exports = {
  expo: {
    name: "La Provvidenza ODV",
    slug: "la-provvidenza-odv",
    version: "1.2.1",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "laprovvidenza",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "it.laprovvidenza.app",
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "Condividi la posizione con la crew durante i servizi",
        NSLocationAlwaysAndWhenInUseUsageDescription:
          "Condividi la posizione anche in background con la crew",
        NSMicrophoneUsageDescription:
          "Trasmetti messaggi audio sul walkie-talkie",
        UIBackgroundModes: ["location", "audio"],
      },
    },
    android: {
      package: "it.laprovvidenza.app",
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#FDFBF7",
      },
      edgeToEdgeEnabled: true,
      config: googleMapsApiKey
        ? { googleMaps: { apiKey: googleMapsApiKey } }
        : {},
      permissions: [
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.RECORD_AUDIO",
        "android.permission.MODIFY_AUDIO_SETTINGS",
        "android.permission.FOREGROUND_SERVICE",
        "android.permission.FOREGROUND_SERVICE_LOCATION",
        "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK",
        "android.permission.WAKE_LOCK",
        "android.permission.POST_NOTIFICATIONS",
      ],
    },
    web: {
      bundler: "metro",
      output: "single",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-image.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#FDFBF7",
        },
      ],
      "expo-font",
      "@react-native-community/datetimepicker",
      "expo-audio",
    ],
    experiments: { typedRoutes: true },
    extra: {
      apiBaseUrl:
        process.env.EXPO_PUBLIC_BACKEND_URL || "http://localhost:8000",
    },
  },
};
