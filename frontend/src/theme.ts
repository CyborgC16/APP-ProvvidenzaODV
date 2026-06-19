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

export const HERO_IMAGE =
  "https://images.unsplash.com/photo-1765233181361-a11f1e5b3c69?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1NzZ8MHwxfHNlYXJjaHwxfHxpdGFsaWFuJTIwYW1idWxhbmNlJTIwdm9sdW50ZWVyc3xlbnwwfHx8fDE3ODE4MjY2NDB8MA&ixlib=rb-4.1.0&q=85";

export const AMBULANCE_IMAGE =
  "https://images.pexels.com/photos/36756313/pexels-photo-36756313.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

export const CIVIL_SERVICE_IMAGE =
  "https://images.unsplash.com/photo-1758599667729-a6f0f8bd213b?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NTYxODh8MHwxfHNlYXJjaHwyfHx5b3VuZyUyMGNpdmlsJTIwc2VydmljZSUyMHZvbHVudGVlcnMlMjB3b3JraW5nfGVufDB8fHx8MTc4MTgyNjY0MHww&ixlib=rb-4.1.0&q=85";
