import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // CSS 변수 기반 — 다크/라이트 모드 전환은 :root 클래스로 처리
        bg: "rgb(var(--color-bg) / <alpha-value>)",
        panel: "rgb(var(--color-panel) / <alpha-value>)",
        panel2: "rgb(var(--color-panel2) / <alpha-value>)",
        border: "rgb(var(--color-border) / <alpha-value>)",
        accent: "rgb(var(--color-accent) / <alpha-value>)",   // lime
        accent2: "rgb(var(--color-accent2) / <alpha-value>)", // citrus yellow
        amber: "rgb(var(--color-amber) / <alpha-value>)",
        muted: "rgb(var(--color-muted) / <alpha-value>)",
        fg: "rgb(var(--color-fg) / <alpha-value>)",
      },
      fontFamily: {
        display: ['"Fraunces"', '"Playfair Display"', "ui-serif", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
