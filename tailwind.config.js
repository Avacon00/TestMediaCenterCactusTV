/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        midnight: {
          950: '#020617', // Main Background
          900: '#0f172a', // Cards/Modals
          800: '#1e1b4b', // Secondary
        },
        cactus: {
          600: '#16a34a', // Primary Button
          500: '#22c55e', // Hover/Icons
          400: '#4ade80', // Text Highlight
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        }
      }
    }
  },
  plugins: [],
}