/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: { colors: { brand: '#df0067', ink: '#1a1a1a', mist: '#f8f8f8' }, fontFamily: { sans: ['Nunito Sans', 'sans-serif'], display: ['Outfit', 'sans-serif'] } } },
  plugins: [],
};
