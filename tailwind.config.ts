import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1360px",
      },
    },
    fontFamily: {
      'kanit': ['var(--font-kanit)'],
      'hind': ['var(--font-hind)'],
      'outfit': ['var(--font-outfit)'],
      'optima-pro': ['var(--font-optima-pro)'],
    },
    extend: {
      colors: {
        border: 'rgba(var(--border-rgb), <alpha-value>)',
        input: 'rgba(var(--input-rgb), <alpha-value>)',
        ring: 'rgba(var(--ring-rgb), <alpha-value>)',
        background: 'rgba(var(--background-rgb), <alpha-value>)',
        foreground: 'rgba(var(--foreground-rgb), <alpha-value>)',
        primary: {
          DEFAULT: 'rgba(var(--primary-rgb), <alpha-value>)',
          foreground: 'rgba(var(--primary-foreground-rgb), <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'rgba(var(--secondary-rgb), <alpha-value>)',
          foreground: 'rgba(var(--secondary-foreground-rgb), <alpha-value>)',
        },
        destructive: {
          DEFAULT: 'rgba(var(--destructive-rgb), <alpha-value>)',
          foreground: 'rgba(var(--destructive-foreground-rgb), <alpha-value>)',
        },
        muted: {
          DEFAULT: 'rgba(var(--muted-rgb), <alpha-value>)',
          foreground: 'rgba(var(--muted-foreground-rgb), <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgba(var(--accent-rgb), <alpha-value>)',
          foreground: 'rgba(var(--accent-foreground-rgb), <alpha-value>)',
        },
        popover: {
          DEFAULT: 'rgba(var(--popover-rgb), <alpha-value>)',
          foreground: 'rgba(var(--popover-foreground-rgb), <alpha-value>)',
        },
        card: {
          DEFAULT: 'rgba(var(--card-rgb), <alpha-value>)',
          foreground: 'rgba(var(--card-foreground-rgb), <alpha-value>)',
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
