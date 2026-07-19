const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || "";

module.exports = {
  expo: {
    name: "La Provvidenza ODV",
    slug: "la-provvidenza-odv",
    version: "2.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "laprovvidenza",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,

    ios: {
      supportsTablet: true,
      bundleIdentifier: "it.laprovvindenza.app",
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "Consente di condividere la posizione mentre l’app è aperta.",
        NSMicrophoneUsageDescription:
          "Consente di registrare messaggi audio mentre l’app è aperta."
      }
    },

    android: {
      package: "it.laprovvindenza.app",
      versionCode: 5,
      allowBackup: false,
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#FDFBF7"
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
        "android.permission.POST_NOTIFICATIONS"
      ],

      blockedPermissions: [
        "android.permission.FOREGROUND_SERVICE",
        "android.permission.FOREGROUND_SERVICE_LOCATION",
        "android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK",
        "android.permission.FOREGROUND_SERVICE_MICROPHONE"
      ]
    },

    web: {
      bundler: "metro",
      output: "single",
      favicon: "./assets/images/favicon.png"
    },

    plugins: [
      "expo-router",
      "./plugins/withGoogleAssistantShortcuts",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-image.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#FDFBF7"
        }
      ],
      "expo-font",
      [
        "expo-local-authentication",
        {
          faceIDPermission: "Consenti a La Provvidenza ODV di usare Face ID per accedere in modo sicuro."
        }
      ],
      "@react-native-community/datetimepicker",
      [
        "expo-audio",
        {
          recordAudioAndroid: true,
          enableBackgroundPlayback: false,
          enableBackgroundRecording: false,
          microphonePermission:
            "Consente a La Provvidenza ODV di registrare messaggi audio."
        }
      ]
    ],

    experiments: {
      typedRoutes: true
    },

    extra: {
      apiBaseUrl:
        process.env.EXPO_PUBLIC_BACKEND_URL ||
        "https://app.laprovvidenza.it"
    }
  }
};
