import { Platform } from "react-native";

export const COLORS = {
  surface: "#F7F8FA",
  surfaceSecondary: "#FFFFFF",
  surfaceTertiary: "#EEF1F5",
  surfaceInverse: "#121A26",
  onSurface: "#121A26",
  onSurfaceInverse: "#FDFBF7",
  onSurfaceMuted: "#5B6776",
  brand: "#FF6B00",
  brandDark: "#E55F00",
  brandLight: "#FFF0E5",
  navy: "#1A2E46",
  navyDark: "#0F1C2E",
  cream: "#F5EFE0",
  success: "#198754",
  warning: "#FFC107",
  error: "#DC3545",
  border: "#E3E7EC",
  borderStrong: "#CCC4B5",
  divider: "#E3E7EC",
  white: "#FFFFFF",
  black: "#000000",
  overlay: "rgba(0,0,0,0.5)",
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const RADIUS = {
  sm: 6,
  md: 12,
  lg: 20,
  pill: 999,
};

export const FONT_FAMILY = Platform.select({
  ios: "System",
  android: "sans-serif",
  default: "System",
});

export const SHADOW = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  floating: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 10,
  },
  fab: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
};

export const LOGO_IMAGE = require("@/assets/images/app/logo.png");
export const HERO_IMAGE = require("@/assets/images/app/home-ambulanza.png");
export const AMBULANCE_IMAGE = require("@/assets/images/app/volontari.jpg");
export const CIVIL_SERVICE_IMAGE = require("@/assets/images/app/servizio-civile.jpg");
export const ABOUT_IMAGE = require("@/assets/images/app/chi-siamo.png");
export const SERVICES_IMAGE = require("@/assets/images/app/servizi.png");

// Alias mantenuto per compatibilità con i componenti esistenti.
export const LOGO_URL = LOGO_IMAGE;

// Risorse web opzionali già utilizzate dalla landing.
export const SITE_BG = "https://app.laprovvidenza.it/wp-content/uploads/sfondo-sito.png";
export const SITE_VIDEO = "https://app.laprovvidenza.it/wp-content/uploads/video-home.mp4";
