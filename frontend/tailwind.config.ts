import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./layouts/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        purple: "#C5A059",
        gold: "#C5A059",
        ink: "#080809",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "'DM Serif Display'", "serif"],
        display: ["'Playfair Display'", "serif"],
        sans: ["var(--font-sans)", "'Jost'", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
