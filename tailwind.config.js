/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      keyframes: {
        'fade-up': {
          '0%': { transform: 'translateY(0)', opacity: '1' },
          '100%': { transform: 'translateY(-1rem)', opacity: '0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 1.2s ease-out forwards',
      },
    },
  },
  plugins: [],
};
