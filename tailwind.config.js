/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        coffee: {
          DEFAULT: '#111111',
          light: '#F8F8F8',
          cream: '#F2F2F2',
          dark: '#000000',
          muted: '#333333',
          tan: '#555555',
          warm: '#999999',
          soft: '#888888',
          border: '#E0E0E0',
          separator: '#F4F4F4',
        },
        accent: {
          DEFAULT: '#333333',
          dark: '#E76F51',
        },
      },
    },
  },
  plugins: [],
};
