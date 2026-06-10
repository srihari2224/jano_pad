/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/components/DoctorInstructionsCard/templates/**/*.{js,jsx}',
    './src/components/DoctorInstructionsCard/styles/tw.css',
  ],
  theme: {
    extend: {
      colors: {
        'jano-crimson': '#e54b4b',
        'jano-crimson-50': '#ffecee',
        'jano-crimson-600': '#d53838',
      },
      fontFamily: {
        ui: ['Figtree', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
