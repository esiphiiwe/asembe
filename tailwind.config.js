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
          50: "#fdf8f3",
          100: "#f9ecde",
          200: "#f1d3b3",
          300: "#e6b380",
          400: "#d89358",
          500: "#c97838",
          600: "#a8622f",
          700: "#875027",
          800: "#6e4322",
          900: "#5b391e",
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
        accent: {
          DEFAULT: "#e8902a",
          soft: "#f9d591",
          strong: "#c27320",
        },
        success: {
          DEFAULT: "#16a34a",
          soft: "#dcfce7",
        },
        danger: {
          DEFAULT: "#dc2626",
          soft: "#fee2e2",
        },
        warning: {
          DEFAULT: "#f59e0b",
          soft: "#fef3c7",
        },
        info: {
          DEFAULT: "#0284c7",
          soft: "#e0f2fe",
        },
      },
      fontFamily: {
        serif: ["Georgia", "serif"],
        sans: ["System", "sans-serif"],
      },
    },
  },
  plugins: [],
};
