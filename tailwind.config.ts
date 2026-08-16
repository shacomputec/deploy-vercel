import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Driven by CSS custom properties injected from the School record
        // so theme colours are editable from the admin panel.
        primary: {
          DEFAULT: "rgb(var(--c-primary) / <alpha-value>)",
          deep: "rgb(var(--c-primary-deep) / <alpha-value>)",
          soft: "rgb(var(--c-primary-soft) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--c-accent) / <alpha-value>)",
          soft: "rgb(var(--c-accent-soft) / <alpha-value>)",
        },
        ink: "rgb(var(--c-ink) / <alpha-value>)",
        paper: "rgb(var(--c-paper) / <alpha-value>)",
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Inter",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        display: [
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Inter",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgb(16 24 40 / 0.04), 0 8px 24px -8px rgb(16 24 40 / 0.12)",
        lift: "0 2px 4px rgb(16 24 40 / 0.05), 0 16px 40px -12px rgb(16 24 40 / 0.18)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
        aurora: {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(40px, -30px) scale(1.12)" },
          "66%": { transform: "translate(-30px, 25px) scale(0.94)" },
        },
        "aurora-rev": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(-45px, 28px) scale(0.92)" },
          "66%": { transform: "translate(35px, -22px) scale(1.1)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out both",
        marquee: "marquee 30s linear infinite",
        "pulse-dot": "pulse-dot 1.6s ease-in-out infinite",
        aurora: "aurora 18s ease-in-out infinite",
        "aurora-rev": "aurora-rev 22s ease-in-out infinite",
        shimmer: "shimmer 1.8s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
