/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './apps/web/src/**/*.{html,ts}',
    './libs/**/*.{html,ts}',
  ],
  theme: {
    extend: {
      colors: {
        night: '#0b1220',
        ink: '#141219',
      },
      borderRadius: {
        medium: '0.75rem',
        large: '1rem',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
