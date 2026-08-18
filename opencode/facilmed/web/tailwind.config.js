/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { 50: '#EFF6FF', 100: '#DBEAFE', 500: '#2563EB', 600: '#1D4ED8', 700: '#1E40AF' },
        success: { 50: '#F0FDF4', 500: '#059669', 600: '#047857' },
        danger: { 50: '#FEF2F2', 500: '#DC2626', 600: '#B91C1C' },
      },
    },
  },
  plugins: [],
};
