/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        coffee: {
          DEFAULT: '#6F4E37',
          light: '#FFF8F3',
          cream: '#FFF0E6',
          dark: '#3D2B1F',
          muted: '#5A3D2A',
          tan: '#A07850',
          warm: '#D4A97A',
          soft: '#C4A882',
          border: '#E0D5CC',
          separator: '#F0E8E0',
        },
        accent: {
          DEFAULT: '#F4A261',
          dark: '#E76F51',
        },
      },
    },
  },
  plugins: [],
};
