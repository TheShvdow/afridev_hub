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
        // Vert Afrique — la teinte de marque (#0F6932) est le `DEFAULT`.
        primary: {
          DEFAULT: '#0F6932',
          50: '#F0FDF4',
          100: '#DCFCE7',
          200: '#BBF7D0',
          300: '#86EFAC',
          400: '#4ADE80',
          500: '#16A34A',
          600: '#0F6932',
          700: '#0B5427',
          800: '#083D1C',
          900: '#052912',
        },
      },
      borderRadius: {
        medium: '0.75rem',
        large: '1rem',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        display: ['Manrope', 'Inter', 'sans-serif'],
        montserrat: ['Montserrat', 'Inter', 'sans-serif'],
        outfit: ['Outfit', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
