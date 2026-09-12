/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: 'var(--color-brand-50)',
          100: 'var(--color-brand-100)',
          200: 'var(--color-brand-200)',
          300: 'var(--color-brand-300)',
          400: 'var(--color-brand-400)',
          500: 'var(--color-brand-500)',
          600: 'var(--color-brand-600)',
          700: 'var(--color-brand-700)',
          800: 'var(--color-brand-800)',
          900: 'var(--color-brand-900)',
        },
        accent: {
          300: 'var(--color-accent-300)',
          400: 'var(--color-accent-400)',
          500: 'var(--color-accent-500)',
          600: 'var(--color-accent-600)',
          soft: 'var(--color-accent-soft)',
        },
        sky: {
          400: '#5BBFD9',
          500: '#3BA7C9',
          600: '#2A8EAE',
        },
        surface: {
          light: 'var(--color-surface-light)',
          dark: 'var(--color-surface-dark)',
          cardLight: 'var(--color-surface-cardLight)',
          cardDark: 'var(--color-surface-cardDark)',
          mist: 'var(--color-surface-mist)',
        },
        ink: {
          light: 'var(--color-ink-light)',
          dark: 'var(--color-ink-dark)',
          mutedLight: 'var(--color-ink-mutedLight)',
          mutedDark: 'var(--color-ink-mutedDark)',
        },
      },
      fontFamily: {
        sans: ['PlusJakartaSans_400Regular'],
        'sans-medium': ['PlusJakartaSans_500Medium'],
        'sans-semibold': ['PlusJakartaSans_600SemiBold'],
        'sans-bold': ['PlusJakartaSans_700Bold'],
        display: ['Fraunces_600SemiBold'],
        'display-bold': ['Fraunces_700Bold'],
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
