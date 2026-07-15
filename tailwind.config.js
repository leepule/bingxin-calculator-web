/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: 'rgb(var(--color-ink) / <alpha-value>)',
        panel: 'rgb(var(--color-panel) / <alpha-value>)',
        rose: {
          300: '#f1a8ca',
          400: '#e881b2',
          500: '#d95b9a',
        },
        violet: {
          300: '#c7b2ff',
          400: '#a98df5',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(232,129,178,.14), 0 24px 80px rgba(0,0,0,.34)',
      },
      fontFamily: {
        sans: ['Inter', 'PingFang SC', 'Microsoft YaHei', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
