/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        /* surfaces */
        base: '#F5F7FB',
        base2: '#F8FAFD',
        card: '#FFFFFF',
        cardhover: '#F3F6FB',
        line: '#E6EAF1',
        line2: '#D8DEE9',
        /* text */
        ink: '#172033',
        muted: '#667085',
        faint: '#98A2B3',
        /* accents */
        primary: '#4F7CFF',
        primarydeep: '#3B63D6',
        accent: '#7C5CFC',
        cyan: '#19B5D1',
        success: '#24B47E',
        orange: '#FF9F43',
        pink: '#EF6A9A',
        red: '#EA5B5B',
        indigo: '#5965D8',
        /* selection tint */
        tint: '#EEF3FF',
      },
      fontFamily: {
        sans: [
          'Inter',
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Segoe UI"',
          '"PingFang SC"',
          '"Microsoft YaHei"',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 6px 24px rgba(20, 32, 60, 0.06)',
        pop: '0 12px 40px rgba(20, 32, 60, 0.12)',
      },
      borderRadius: {
        xl2: '14px',
      },
    },
  },
  plugins: [],
}
