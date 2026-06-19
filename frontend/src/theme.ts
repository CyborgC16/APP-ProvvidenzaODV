import { Platform } from "react-native";

export const COLORS = {
  surface: "#FDFBF7",
  surfaceSecondary: "#FFFFFF",
  surfaceTertiary: "#F2EFE9",
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
  border: "#E5E0D8",
  borderStrong: "#CCC4B5",
  divider: "#E5E0D8",
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
  fab: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
};

export const LOGO_URL =
  "https://customer-assets.emergentagent.com/job_6ff22b11-31a6-448a-bcd0-492ab14ab6b8/artifacts/qkyr1ljo_LOGO%20FINALE.png";

// Hero principale (schermata home) - ambulanza notturna La Provvidenza
export const HERO_IMAGE =
  "https://customer-assets.emergentagent.com/job_servizio-civile-app/artifacts/1l3eqhz3_ChatGPT%20Image%2029%20set%202025%2C%2015_48_09.png";

// I Nostri Volontari - operatrice davanti ambulanza
export const AMBULANCE_IMAGE =
  "https://customer-assets.emergentagent.com/job_servizio-civile-app/artifacts/1y3dzyqi_20250908_085113.jpg";

// Servizio Civile - logo SCU
export const CIVIL_SERVICE_IMAGE =
  "https://customer-assets.emergentagent.com/job_servizio-civile-app/artifacts/zm7kc7p2_servizio_civile_universale_logo.png";

// Chi Siamo - sfondo gruppo associazione
export const ABOUT_IMAGE =
  "https://customer-assets.emergentagent.com/job_servizio-civile-app/artifacts/9e1336w2_La-provvidenza-1920-x-529-px-1080-x-1920-px.png";

// Servizi - sfondo parco auto
export const SERVICES_IMAGE =
  "https://customer-assets.emergentagent.com/job_servizio-civile-app/artifacts/qwk7hatz_La-provvidenza-1920-x-529-px-1080-x-1920-px-1.png";
