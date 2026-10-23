/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6C5CE7',
          light: '#A29BFE',
          dark: '#5A4BD1',
        },
        surface: '#FFFFFF',
        background: '#F8F9FA',
        border: '#E5E7EB',
        text: {
          DEFAULT: '#1A1A2E',
          secondary: '#6B7280',
        },
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
