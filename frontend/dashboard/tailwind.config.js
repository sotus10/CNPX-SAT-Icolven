/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          700: '#1747c9',
        },
        canvas: '#f9f9f9',
        line: '#eff0f6',
        carbon: '#151e23',
      },
      boxShadow: {
        card: '0px 1px 3px rgba(16, 24, 40, 0.06), 0px 1px 2px rgba(16, 24, 40, 0.04)',
      },
      borderRadius: {
        card: '18px',
      },
    },
  },
  plugins: [],
}