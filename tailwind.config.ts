import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif']
      },
      colors: {
        ink: '#111217',
        fog: '#f4f6f8',
        mint: '#0ea978',
        ember: '#f26522',
        night: '#1f2937'
      }
    }
  },
  plugins: []
};

export default config;
