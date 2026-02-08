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
        bg: {
          primary: "var(--bg-primary)",
          secondary: "var(--bg-secondary)",
          tertiary: "var(--bg-tertiary)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          hover: "var(--primary-hover)",
          light: "var(--primary-light)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          light: "var(--accent-light)",
        },
        success: {
          DEFAULT: "var(--success)",
          light: "var(--success-light)",
        },
        error: {
          DEFAULT: "var(--error)",
          light: "var(--error-light)",
        },
        warning: {
          DEFAULT: "var(--warning)",
        },
        border: {
          DEFAULT: "var(--border)",
        },
      },
      fontFamily: {
        jp: [
          "'Noto Sans JP'",
          "'Hiragino Sans'",
          "sans-serif",
        ],
        sans: [
          "'Inter'",
          "-apple-system",
          "BlinkMacSystemFont",
          "'Segoe UI'",
          "sans-serif",
        ],
      },
      fontSize: {
        h1: ["24px", { lineHeight: "1.3", fontWeight: "700" }],
        h2: ["20px", { lineHeight: "1.35", fontWeight: "600" }],
        h3: ["18px", { lineHeight: "1.4", fontWeight: "600" }],
        body: ["16px", { lineHeight: "1.6", fontWeight: "400" }],
        "body-sm": ["14px", { lineHeight: "1.5", fontWeight: "400" }],
        caption: ["12px", { lineHeight: "1.4", fontWeight: "400" }],
        kanji: ["40px", { lineHeight: "1.2", fontWeight: "700" }],
        reading: ["20px", { lineHeight: "1.4", fontWeight: "400" }],
        "jp-body": ["18px", { lineHeight: "1.8", fontWeight: "400" }],
        "jp-passage": ["18px", { lineHeight: "2.0", fontWeight: "400" }],
      },
      borderRadius: {
        lg: "12px",
      },
      maxWidth: {
        container: "1024px",
        "container-wide": "1280px",
      },
    },
  },
  plugins: [],
};

export default config;
