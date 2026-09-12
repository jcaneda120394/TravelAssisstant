/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#E8F6F5',
          100: '#C5EAE7',
          200: '#9ADAD5',
          300: '#64C4BC',
          400: '#2FA89E',
          500: '#0F8F85',
          600: '#0B726A',
          700: '#0A5A54',
          800: '#0A4743',
          900: '#0B3B38',
        },
        accent: {
          400: '#F0B429',
          500: '#D99A12',
          600: '#B87D0C',
        },
        surface: {
          light: '#F7FAF9',
          dark: '#0C1413',
          cardLight: '#FFFFFF',
          cardDark: '#15201E',
        },
        ink: {
          light: '#10201E',
          dark: '#E8F2F0',
          mutedLight: '#5B6F6C',
          mutedDark: '#9BB0AC',
        },
      },
      fontFamily: {
        sans: ['PlusJakartaSans_400Regular'],
        'sans-medium': ['PlusJakartaSans_500Medium'],
        'sans-semibold': ['PlusJakartaSans_600SemiBold'],
        'sans-bold': ['PlusJakartaSans_700Bold'],
      },
      borderRadius: {
        xl: '16px',
        '2xl': '20px',
        '3xl': '28px',
      },
    },
  },
  plugins: [],
};
