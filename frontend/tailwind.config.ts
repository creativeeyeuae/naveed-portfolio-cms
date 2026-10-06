import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./layouts/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        purple: "#6226FF",
        gold: "#FFC01D",
        ink: "#09060E",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "'Plus Jakarta Sans'", "sans-serif"],
        display: ["var(--font-serif)", "'Plus Jakarta Sans'", "sans-serif"],
        sans: ["var(--font-sans)", "'Plus Jakarta Sans'", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
