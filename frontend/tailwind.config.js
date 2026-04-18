/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#8b5cf6", // Purple
        secondary: "#0ea5e9", // Sky blue
        accent: "#ec4899", // Pink
        dark: "#1f2937", // Dark gray
      },
      animation: {
        "pulse-scale": "pulse-scale 0.6s ease-out",
        confetti: "confetti 2s ease-out forwards",
      },
      keyframes: {
        "pulse-scale": {
          "0%": { transform: "scale(1)", opacity: "1" },
          "100%": { transform: "scale(1.1)", opacity: "0" },
        },
        confetti: {
          "0%": { transform: "translateY(0) rotate(0deg)", opacity: "1" },
          "100%": {
            transform: "translateY(100px) rotate(360deg)",
            opacity: "0",
          },
        },
      },
    },
  },
  plugins: [],
};
