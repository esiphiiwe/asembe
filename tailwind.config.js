/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#fdf8f6",
          100: "#f9ebe4",
          200: "#f3d5c5",
          300: "#e8b89a",
          400: "#db9468",
          500: "#d17a47",
          600: "#c3653c",
          700: "#a25033",
          800: "#84432f",
          900: "#6c3a29",
        },
        neutral: {
          50: "#fafaf9",
          100: "#f5f5f4",
          200: "#e7e5e4",
          300: "#d6d3d1",
          400: "#a8a29e",
          500: "#78716c",
          600: "#57534e",
          700: "#44403c",
          800: "#292524",
          900: "#1c1917",
        },
        accent: "#e8572a",
      },
      fontFamily: {
        serif: ["Georgia", "serif"],
        sans: ["System", "sans-serif"],
      },
    },
  },
  plugins: [],
};
