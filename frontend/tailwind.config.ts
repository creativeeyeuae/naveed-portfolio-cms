import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./layouts/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        purple: "#7C3AED",
        gold: "#C4A44A",
        ink: "#0B0B0D",
      },
      fontFamily: {
        serif: ["'DM Serif Display'", "serif"],
        display: ["'Playfair Display'", "serif"],
        sans: ["'Jost'", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
