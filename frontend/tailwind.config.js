/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#f6f6f6',
          100: '#e7e7e7',
          200: '#d1d1d1',
          300: '#b0b0b0',
          400: '#888888',
          500: '#6d6d6d',
          600: '#5d5d5d',
          700: '#4f4f4f',
          800: '#454545',
          900: '#1e2022', // Dark background
        },
        brass: {
          50: '#fbfaf7',
          100: '#f4ebd8',
          200: '#e9d7b2',
          300: '#dbbe83',
          400: '#caa058',
          500: '#be873f', // Accent color
          600: '#a36932',
          700: '#834f2b',
          800: '#6a3f27',
          900: '#42241b',
        },
        mint: {
          500: '#2ecc71',
        },
        parchment: {
          100: '#f9f6f0',
          200: '#efebe3',
        }
      },
      borderRadius: {
        'seal': '12px',
      }
    },
  },
  plugins: [],
}
