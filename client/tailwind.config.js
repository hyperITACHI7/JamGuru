/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'jg-green':  '#1DB954',
        'jg-black':  '#121212',
        'jg-dark':   '#181818',
        'jg-card':   '#282828',
        'jg-hover':  '#333333',
      }
    }
  },
  plugins: []
}
