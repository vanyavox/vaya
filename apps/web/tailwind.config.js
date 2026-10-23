/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6C5CE7',
          light: '#A29BFE',
          dark: '#5A4BD1',
        },
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        background: 'rgb(var(--c-bg) / <alpha-value>)',
        border: 'rgb(var(--c-border) / <alpha-value>)',
        text: {
          DEFAULT: 'rgb(var(--c-text) / <alpha-value>)',
          secondary: 'rgb(var(--c-muted) / <alpha-value>)',
        },
        hover: 'rgb(var(--c-hover) / <alpha-value>)',
        success: '#00B894',
        warning: '#FDCB6E',
        danger: '#E17055',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
        btn: '8px',
      },
    },
  },
  plugins: [],
};
