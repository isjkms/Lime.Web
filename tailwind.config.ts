import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b0710",
        panel: "#161120",
        panel2: "#1f1830",
        border: "#2d2342",
        accent: "#ff5c8a",       // rose
        accent2: "#a78bfa",      // violet
        amber: "#ffb347",
        muted: "#928aa5",
      },
      fontFamily: {
        display: ['"Fraunces"', '"Playfair Display"', "ui-serif", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
