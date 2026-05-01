import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        crimson: {
          50: "#fff1f3",
          500: "#d7193f",
          600: "#b31332",
          700: "#8e1029",
          900: "#3b0712"
        },
        ember: "#ffcf6a",
        gold: "#f6b73c"
      },
      boxShadow: {
        glow: "0 0 36px rgba(215, 25, 63, 0.32)",
        gold: "0 0 26px rgba(246, 183, 60, 0.28)"
      },
      fontFamily: {
        montserrat: ["var(--font-montserrat)", "Montserrat", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
