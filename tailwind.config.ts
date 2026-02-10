import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        vt: {
          primary: '#4255FF',
          bg: '#F6F7FB',
          surface: '#FFFFFF',
          text: '#282E3E',
          muted: '#586380',
          border: '#D9DDE8',
          overlay: 'rgb(26 29 40 / 50%)',
          soft: '#EEF1FA',
        },
      },
      borderRadius: {
        vt: '20px',
        vtlg: '24px',
        pill: '9999px',
      },
      boxShadow: {
        'vt-card': '0 12px 28px rgba(46,56,86,0.08)',
      },
      spacing: {
        2: '8px',
        3: '12px',
        4: '16px',
        6: '24px',
        8: '32px',
      },
      fontFamily: {
        sans: ['Inter', 'Avenir Next', 'Segoe UI', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
}

export default config
