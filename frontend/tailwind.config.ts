import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./layouts/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        purple: "#A855F7",
        gold: "#8B5CF6",
        ink: "#09060E",
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
