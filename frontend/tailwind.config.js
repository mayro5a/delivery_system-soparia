/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Vermelhos do cardápio: escuro (#9E1B1B), forte (#B52620) e profundo (#741414).
        brand: {
          50: '#fdf1ef',
          100: '#f9dcd8',
          200: '#f0b3ac',
          300: '#e0827a',
          400: '#cc4f47',
          500: '#B52620',
          600: '#9E1B1B',
          700: '#741414',
          800: '#560e0e',
          900: '#3a0808',
        },
        // Creme/bege do papel do cardápio (#F5E6C8).
        cream: {
          50: '#fdf8ee',
          100: '#F5E6C8',
          200: '#ead6ad',
          300: '#dcc08c',
        },
        // Marrom madeira (#7A4728), marrom escuro (#5A301C) e carvão (#211D1A).
        broth: {
          500: '#7A4728',
          600: '#6a3c22',
          700: '#5A301C',
          800: '#3e2114',
          900: '#211D1A',
        },
        // Amarelo/dourado (#F2B51D) — detalhes, selos e destaques.
        gold: {
          300: '#f8d979',
          400: '#f5c94a',
          500: '#F2B51D',
          600: '#d99c0c',
          700: '#a97708',
        },
        // Verde (#4F7A3A) — reservado principalmente para o WhatsApp.
        basil: {
          400: '#6f9a58',
          500: '#4F7A3A',
          600: '#3f622e',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Zilla Slab"', 'Georgia', 'serif'],
      },
      transitionTimingFunction: {
        snap: 'cubic-bezier(0.23, 1, 0.32, 1)',
      },
      boxShadow: {
        card: '0 0 0 1px rgba(90, 48, 28, 0.12), 0 1px 2px rgba(33, 29, 26, 0.06)',
        // Cartão "vintage": borda dupla fina em marrom, como moldura de cardápio.
        vintage:
          '0 0 0 1px rgba(122, 71, 40, 0.35), 0 0 0 4px #F5E6C8, 0 0 0 5px rgba(122, 71, 40, 0.25), 0 10px 24px -14px rgba(33, 29, 26, 0.45)',
        floating: '0 14px 30px -8px rgba(33, 29, 26, 0.45)',
      },
      backgroundImage: {
        // Textura sutil de papel (ruído em dois tons de creme), sem imagem externa.
        paper:
          'radial-gradient(circle at 20% 10%, rgba(255,255,255,0.35) 0, rgba(255,255,255,0) 40%), radial-gradient(circle at 80% 90%, rgba(122,71,40,0.06) 0, rgba(122,71,40,0) 45%)',
      },
      keyframes: {
        'rise-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pop: {
          '0%': { transform: 'scale(1)' },
          '35%': { transform: 'scale(1.14)' },
          '100%': { transform: 'scale(1)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
      },
      animation: {
        'rise-in': 'rise-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        pop: 'pop 0.32s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'pulse-soft': 'pulse-soft 1.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
