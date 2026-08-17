/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        coffee: {
          DEFAULT: '#3A1B0F',
          light: '#FFFFFF',
          cream: '#FFFFFF',
          dark: '#2A120A',
          muted: '#5E493D',
          tan: '#816F62',
          warm: '#A59688',
          soft: '#8B7A6D',
          border: '#C8BFB0',
          separator: '#DED6C8',
        },
        accent: {
          DEFAULT: '#E6531E',
          dark: '#BE3E12',
        },
      },
    },
  },
  plugins: [],
};
