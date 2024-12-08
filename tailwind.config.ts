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
        "2xl": "1300px",
      },
    },
    fontFamily: {
      'barlow': ['var(--font-barlow)'],
      'source-serif-4': ['var(--font-source-serif-4)'],
    },
    extend: {
      colors: {
        border: 'rgba(var(--border-rgb), <alpha-value>)',
        black: 'rgba(var(--black-rgb), <alpha-value>)',
        white: 'rgba(var(--white-rgb), <alpha-value>)',
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
        dark: {
          DEFAULT: 'rgba(var(--dark-rgb), <alpha-value>)',
          foreground: 'rgba(var(--dark-foreground-rgb), <alpha-value>)',
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
        'pulse-border': {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(1.7)', opacity: '0' },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
      transitionDuration: {
        '2000': '2000ms',
        '3000': '3000ms',
        '4000': '4000ms',
        '5000': '5000ms',
      }
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
