/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    './design-system/**/*.{ts,tsx}',
  ],
  // Safelist ensures these classes are always generated (for colorblind mode)
  safelist: [
    'text-accessible-success',
    'text-accessible-warning',
    'text-accessible-error',
    'text-accessible-info',
    'text-accessible-neutral',
    'bg-accessible-success',
    'bg-accessible-warning',
    'bg-accessible-error',
    'bg-accessible-info',
    'bg-accessible-success/10',
    'bg-accessible-success/20',
    'bg-accessible-error/10',
    'bg-accessible-error/20',
    'bg-accessible-warning/20',
    'border-accessible-success/30',
    'border-accessible-error/30',
    'from-accessible-success/30',
    'from-accessible-error/30',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // IP Fabric brand colors
        brand: {
          primary: "hsl(220, 100%, 50%)",
          secondary: "hsl(280, 100%, 70%)",
          tertiary: "hsl(160, 100%, 40%)",
        },
        // Network status colors
        network: {
          online: "hsl(120, 100%, 40%)",
          warning: "hsl(45, 100%, 50%)",
          critical: "hsl(0, 100%, 60%)",
          offline: "hsl(0, 0%, 40%)",
        },
        // Severity levels
        severity: {
          low: "hsl(200, 100%, 70%)",
          medium: "hsl(35, 100%, 60%)",
          high: "hsl(15, 100%, 60%)",
          critical: "hsl(0, 100%, 60%)",
        },
        // Okabe-Ito Accessible Colors (for colorblind mode)
        accessible: {
          success: "#009E73",    // Bluish-green
          warning: "#E69F00",    // Orange
          error: "#D55E00",      // Vermilion
          info: "#56B4E9",       // Sky blue
          neutral: "#999999",    // Grey
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Consolas", "monospace"],
        display: ["Geist", "Inter", "system-ui", "sans-serif"],
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
        "fade-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "slide-in": "slide-in 0.3s ease-out",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}