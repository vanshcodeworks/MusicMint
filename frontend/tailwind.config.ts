/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Core backgrounds
        void:    "#07070f",
        abyss:   "#0d0d1a",
        surface: "#12121f",
        // increased glass alpha for stronger contrast
        glass:   "rgba(255,255,255,0.10)",

        // Neon accents
        neon: {
          purple: "#a855f7",
          cyan:   "#22d3ee",
          pink:   "#ec4899",
          green:  "#4ade80",
          amber:  "#fbbf24",
        },
      },
      fontFamily: {
        display: ["'Syne'", "sans-serif"],
        body:    ["'DM Sans'", "sans-serif"],
        mono:    ["'DM Mono'", "monospace"],
      },
      backgroundImage: {
        "grid-lines":
          "linear-gradient(rgba(168,85,247,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.05) 1px, transparent 1px)",
        "neon-glow-purple":
          "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(168,85,247,0.25), transparent)",
        "neon-glow-cyan":
          "radial-gradient(ellipse 60% 40% at 80% 110%, rgba(34,211,238,0.15), transparent)",
        "card-shine":
          "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 50%, rgba(255,255,255,0.02) 100%)",
      },
      backgroundSize: {
        "grid": "48px 48px",
      },
      borderColor: {
        // slightly stronger borders for glass effect
        glass: "rgba(255,255,255,0.14)",
        "glass-hover": "rgba(255,255,255,0.26)",
        "neon-purple": "rgba(168,85,247,0.5)",
        "neon-cyan":   "rgba(34,211,238,0.5)",
        "neon-pink":   "rgba(236,72,153,0.5)",
      },
      boxShadow: {
        "neon-purple": "0 0 20px rgba(168,85,247,0.35), 0 0 60px rgba(168,85,247,0.1)",
        "neon-cyan":   "0 0 20px rgba(34,211,238,0.35),  0 0 60px rgba(34,211,238,0.1)",
        "neon-pink":   "0 0 20px rgba(236,72,153,0.35),  0 0 60px rgba(236,72,153,0.1)",
        "glass":       "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)",
        "glass-lg":    "0 20px 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)",
        "card-hover":  "0 18px 56px rgba(168,85,247,0.20), 0 6px 18px rgba(0,0,0,0.5)",
      },
      animation: {
        "pulse-slow":    "pulse 4s cubic-bezier(0.4,0,0.6,1) infinite",
        "float":         "float 6s ease-in-out infinite",
        "shimmer":       "shimmer 2.5s linear infinite",
        "glow-pulse":    "glowPulse 3s ease-in-out infinite",
        "scan":          "scan 4s linear infinite",
        "fade-in":       "fadeIn 0.4s ease forwards",
        "slide-up":      "slideUp 0.4s cubic-bezier(0.16,1,0.3,1) forwards",
        "scale-in":      "scaleIn 0.3s cubic-bezier(0.16,1,0.3,1) forwards",
        "eq-bar":        "eqBar 1.2s ease-in-out infinite alternate",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":       { transform: "translateY(-12px)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition:  "200% 0" },
        },
        glowPulse: {
          "0%, 100%": { opacity: "0.6" },
          "50%":       { opacity: "1" },
        },
        scan: {
          "0%":   { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(24px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        scaleIn: {
          from: { opacity: "0", transform: "scale(0.92)" },
          to:   { opacity: "1", transform: "scale(1)" },
        },
        eqBar: {
          from: { scaleY: "0.2" },
          to:   { scaleY: "1" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
      typography: {
        DEFAULT: { css: { color: "rgba(255,255,255,0.85)" } },
      },
    },
  },
  plugins: [],
};