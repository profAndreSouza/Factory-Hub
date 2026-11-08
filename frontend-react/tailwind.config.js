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
        industrial: {
          900: '#0f172a',
          800: '#1e293b',
          700: '#334155',
          600: '#475569',
          500: '#64748b',
          accent: '#0284c7', // Steel blue
          alert: '#f59e0b',
          danger: '#ef4444',
          success: '#10b981',
        }
      }
    },
  },
  plugins: [],
}

