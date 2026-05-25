import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ─── Brand pink ───────────────────────────────────
        pink: {
          primary: "#e879a0",   // vibrant pink — main brand color
          hover:   "#d6628c",   // darker on hover
          light:   "#fce8f3",   // very light pink bg
          muted:   "#f0b8d0",   // muted pink border / accent
          dark:    "#a0395e",   // deep rose for text on light bg
        },
        // ─── Sidebar ──────────────────────────────────────
        sidebar: {
          bg:     "#2D2D2D",    // dark gray sidebar
          hover:  "#3D3336",    // slightly lighter on hover
          active: "#e879a0",    // pink active state
          text:   "#C8BEC1",    // muted light for nav items
          muted:  "#7A6F72",    // very muted sidebar text
        },
        // ─── Warm neutrals ────────────────────────────────
        warm: {
          bg:     "#F5F3F0",    // page background
          card:   "#FFFFFF",    // card background
          input:  "#FAF8F9",    // input background
          hover:  "#F7F2F4",    // card hover
          border: "#EDE8EB",    // default border
          divide: "#F0EBED",    // divider lines
        },
        // ─── Text ─────────────────────────────────────────
        ink: {
          DEFAULT:   "#1C1618", // near-black, warm tint
          secondary: "#6E6268", // pink-gray secondary text
          muted:     "#9E9297", // muted/placeholder text
          faint:     "#C5BFC1", // very faint labels
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card:     "0 1px 3px rgba(28,22,24,0.06), 0 1px 2px rgba(28,22,24,0.04)",
        "card-md":"0 4px 12px rgba(28,22,24,0.08), 0 2px 4px rgba(28,22,24,0.04)",
        "pink-glow": "0 0 0 3px rgba(232,121,160,0.2)",
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
