/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        coffee: {
          DEFAULT: '#101114',
          light: '#FFFFFF',
          cream: '#FFFFFF',
          dark: '#050608',
          muted: '#3F4248',
          tan: '#5F636B',
          warm: '#8D929B',
          soft: '#70757E',
          border: '#D8DADE',
          separator: '#ECEDEF',
        },
        accent: {
          DEFAULT: '#123C96',
          dark: '#08276F',
          yellow: '#F2DF36',
          'yellow-soft': '#FFF9C9',
        },
      },
    },
  },
  plugins: [],
};
