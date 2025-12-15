// Referee Training Platform - Dark Theme Design Tokens
// Professional football/referee training visual identity

export const designTokens = {
  palette: {
    // Primary dark blues
    dark: {
      900: "#0A0F1C",  // Deepest background
      800: "#0E1628",  // Card backgrounds
      700: "#131D35",  // Elevated surfaces
      600: "#1A2744",  // Borders, dividers
      500: "#243352",  // Subtle backgrounds
      400: "#2E4066",  // Hover states
    },
    // Accent cyan/teal
    cyan: {
      DEFAULT: "#00E8F8",
      primary: "#00E8F8",
      secondary: "#00D8F0",
      dark: "#0098D8",
      glow: "rgba(0, 232, 248, 0.35)",
    },
    // Warm accent (beige/gold for accent lines)
    warm: {
      DEFAULT: "#C4A77D",
      light: "#D4BC96",
      dark: "#A68B5B",
    },
    // Neutrals for text
    text: {
      primary: "#F8F9FA",
      secondary: "#A8B4C4",
      muted: "#6B7A8F",
      inverse: "#0A0F1C",
    },
    // Surfaces
    surface: {
      dark: "#0A0F1C",
      card: "#0E1628",
      elevated: "#131D35",
      overlay: "rgba(10, 15, 28, 0.85)",
    },
    // Status colors
    status: {
      success: "#1BC47D",
      successBg: "rgba(27, 196, 125, 0.15)",
      warning: "#F5B400",
      warningBg: "rgba(245, 180, 0, 0.15)",
      danger: "#FF4D6D",
      dangerBg: "rgba(255, 77, 109, 0.15)",
      info: "#00A5E8",
      infoBg: "rgba(0, 165, 232, 0.15)",
    },
    // Border colors
    border: {
      subtle: "#1A2744",
      default: "#243352",
      strong: "#2E4066",
      accent: "#00E8F8",
    },
  },
  gradients: {
    // Main background gradients
    heroBackground: "linear-gradient(135deg, #0A0F1C 0%, #131D35 50%, #0E1628 100%)",
    cardBackground: "linear-gradient(180deg, #131D35 0%, #0E1628 100%)",
    // Accent gradients
    accentLine: "linear-gradient(90deg, #C4A77D 0%, #00E8F8 50%, #0098D8 100%)",
    cyanGlow: "linear-gradient(90deg, #00E8F8 0%, #00D8F0 100%)",
    // Button gradients
    buttonPrimary: "linear-gradient(135deg, #00E8F8 0%, #00D8F0 100%)",
    buttonSecondary: "linear-gradient(135deg, #1A2744 0%, #243352 100%)",
    // Overlay for images
    imageOverlay: "linear-gradient(180deg, rgba(10, 15, 28, 0) 0%, rgba(10, 15, 28, 0.95) 100%)",
    // Stadium/pitch inspired gradient
    pitchGradient: "linear-gradient(180deg, #0E1628 0%, #1A3A2E 50%, #0E1628 100%)",
  },
  shadows: {
    sm: "0 2px 8px rgba(0, 0, 0, 0.3)",
    md: "0 4px 16px rgba(0, 0, 0, 0.4)",
    lg: "0 8px 32px rgba(0, 0, 0, 0.5)",
    glow: "0 0 20px rgba(0, 232, 248, 0.3)",
    glowStrong: "0 0 40px rgba(0, 232, 248, 0.5)",
    card: "0 4px 20px rgba(0, 0, 0, 0.4)",
    elevated: "0 8px 30px rgba(0, 0, 0, 0.5)",
    focus: "0 0 0 3px rgba(0, 232, 248, 0.4)",
  },
  radii: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    "2xl": 32,
    pill: 999,
  },
  spacing: [4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80],
  typography: {
    fontFamily: {
      primary: "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    },
    weights: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    sizes: {
      display: 48,
      h1: 36,
      h2: 28,
      h3: 22,
      h4: 18,
      body: 16,
      small: 14,
      caption: 12,
      tiny: 10,
    },
    lineHeights: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.7,
    },
  },
  animation: {
    fast: "150ms",
    normal: "250ms",
    slow: "400ms",
    easing: "cubic-bezier(0.4, 0, 0.2, 1)",
  },
};

export default designTokens;
