/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f4ff",
          100: "#dce6ff",
          500: "#4f6ef7",
          600: "#3b57f5",
          700: "#2c42e0",
          900: "#1a2680",
        },
      },
    },
  },
  plugins: [],
};
