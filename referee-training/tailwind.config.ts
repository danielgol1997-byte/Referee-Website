import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // IFAB-inspired palette - Sophisticated slate gray and gold - LIGHTENED
        dark: {
          900: "#323E4D",
          800: "#3D4C5E",
          700: "#495869",
          600: "#576779",
          500: "#67778A",
          400: "#7A899C",
          300: "#8E9EAF",
        },
        // IFAB accent - Elegant light gold/champagne - slightly more vivid
        accent: {
          DEFAULT: "#EDE58C",
          50: "#FDFCF0",
          100: "#F9F6E0",
          200: "#F4EFC8",
          300: "#EDE58C",
          400: "#E3D97E",
          500: "#D5C96A",
          600: "#C4B860",
          700: "#A89D52",
          800: "#8C8244",
          900: "#706736",
        },
        // Secondary accent - Soft gray-blue
        secondary: {
          DEFAULT: "#8A95A5",
          light: "#9CA7B5",
          dark: "#6F7A89",
        },
        // Cyan accent for video library
        cyan: {
          DEFAULT: "#00E8F8",
          50: "#E0FCFF",
          100: "#B3F8FF",
          200: "#80F4FF",
          300: "#4DF0FF",
          400: "#1AECFF",
          500: "#00E8F8",
          600: "#00B8C5",
          700: "#008892",
          800: "#005860",
          900: "#00282D",
        },
        // Warm accent (beige/gold)
        warm: {
          DEFAULT: "#C4A77D",
          light: "#D4BC96",
          dark: "#A68B5B",
        },
        // Text colors - IFAB style - HIGH CONTRAST
        text: {
          primary: "#FFFFFF",
          secondary: "#E8EEF5",
          muted: "#D0DAE6",
          inverse: "#323E4D",
          gold: "#EDE58C",
        },
        // Status colors
        status: {
          success: "#E8E09A",
          "success-bg": "rgba(232, 224, 154, 0.12)",
          warning: "#DDD29C",
          "warning-bg": "rgba(221, 210, 156, 0.12)",
          danger: "#B89090",
          "danger-bg": "rgba(184, 144, 144, 0.12)",
          info: "#8A95A5",
          "info-bg": "rgba(138, 149, 165, 0.12)",
        },
        // Border colors - Subtle grays with gold option
        border: {
          subtle: "#2F3A47",
          DEFAULT: "#3A4656",
          strong: "#485566",
          accent: "#E8E09A",
        },
      },
      backgroundImage: {
        // Main gradients - IFAB slate variations - LIGHTENED
        "hero-gradient": "linear-gradient(135deg, #323E4D 0%, #495869 50%, #3D4C5E 100%)",
        "card-gradient": "linear-gradient(180deg, #495869 0%, #3D4C5E 100%)",
        "section-gradient": "linear-gradient(180deg, #3D4C5E 0%, #323E4D 100%)",
        // Accent gradients - IFAB gold - slightly more vivid
        "accent-line": "linear-gradient(90deg, transparent 0%, #EDE58C 50%, transparent 100%)",
        "accent-glow": "linear-gradient(90deg, #EDE58C 0%, #E3D97E 100%)",
        // Button gradients
        "button-primary": "linear-gradient(135deg, #EDE58C 0%, #E3D97E 100%)",
        "button-secondary": "linear-gradient(135deg, #576779 0%, #67778A 100%)",
        // Overlays - Slate gradients
        "image-overlay": "linear-gradient(180deg, rgba(37, 45, 56, 0) 0%, rgba(37, 45, 56, 0.95) 100%)",
        "image-overlay-full": "linear-gradient(180deg, rgba(37, 45, 56, 0.75) 0%, rgba(37, 45, 56, 0.92) 100%)",
        // Pitch/stadium inspired - Subtle slate
        "pitch-gradient": "linear-gradient(180deg, #364250 0%, #3A4858 50%, #364250 100%)",
      },
      boxShadow: {
        "sm": "0 2px 8px rgba(0, 0, 0, 0.4)",
        "md": "0 4px 16px rgba(0, 0, 0, 0.5)",
        "lg": "0 8px 32px rgba(0, 0, 0, 0.6)",
        "glow": "0 0 20px rgba(232, 224, 154, 0.15)",
        "glow-strong": "0 0 30px rgba(232, 224, 154, 0.25)",
        "card": "0 4px 20px rgba(0, 0, 0, 0.5)",
        "elevated": "0 8px 30px rgba(0, 0, 0, 0.6)",
        "focus": "0 0 0 3px rgba(232, 224, 154, 0.3)",
        "inner-glow": "inset 0 1px 0 rgba(232, 224, 154, 0.03)",
      },
      borderRadius: {
        "xs": "4px",
        "sm": "8px",
        "md": "12px",
        "lg": "16px",
        "xl": "24px",
        "2xl": "32px",
        "pill": "999px",
      },
      fontFamily: {
        sans: ["Inter", "var(--font-geist-sans)", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      fontSize: {
        "display": ["3rem", { lineHeight: "1.2", fontWeight: "700" }],
        "h1": ["2.25rem", { lineHeight: "1.2", fontWeight: "700" }],
        "h2": ["1.75rem", { lineHeight: "1.3", fontWeight: "600" }],
        "h3": ["1.375rem", { lineHeight: "1.4", fontWeight: "600" }],
        "h4": ["1.125rem", { lineHeight: "1.4", fontWeight: "600" }],
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
        "in": "fadeIn 0.5s ease-out",
        "slide-in-from-top-4": "slideInFromTop 0.5s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInFromTop: {
          "0%": { opacity: "0", transform: "translateY(-16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(232, 224, 154, 0.2)" },
          "50%": { boxShadow: "0 0 30px rgba(232, 224, 154, 0.3)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      perspective: {
        '1000': '1000px',
        '2000': '2000px',
      },
    },
  },
  plugins: [],
};

export default config;
