/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0b0d10',
          900: '#11141a',
          800: '#171b22',
          700: '#1f242d',
          600: '#2a313c',
          500: '#3a4250',
          400: '#5a6373',
          300: '#8a93a3',
          200: '#c4cad6',
          100: '#e7eaf0',
        },
        accent: {
          orange: '#ff8000',
          green: '#00e054',
          blue: '#40bcf4',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        pop: {
          '0%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(1.18)' },
          '100%': { transform: 'scale(1)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
      },
      animation: {
        pop: 'pop 320ms ease-out',
        'fade-in': 'fadeIn 220ms ease-out both',
        shimmer: 'shimmer 1.4s linear infinite',
      },
      boxShadow: {
        poster: '0 10px 30px -10px rgba(0, 0, 0, 0.6), 0 4px 14px -6px rgba(0, 0, 0, 0.45)',
      },
    },
  },
  plugins: [],
};
