export const designTokens = {
  colors: {
    primary: '#4255FF',
    background: '#F6F7FB',
    surface: '#FFFFFF',
    textDark: '#282E3E',
    textMuted: '#586380',
    border: '#D9DDE8',
    soft: '#EEF1FA',
    overlay: 'rgb(26 29 40 / 50%)',
  },
  radius: {
    card: '20px',
    panel: '24px',
    pill: '9999px',
  },
  spacing: [8, 12, 16, 24, 32],
  shadows: {
    card: '0 12px 28px rgba(46,56,86,0.08)',
  },
  typography: {
    headingXl: 'text-4xl font-semibold',
    headingLg: 'text-3xl font-semibold',
    headingMd: 'text-2xl font-semibold',
    body: 'text-base font-medium',
    caption: 'text-sm font-medium',
  },
} as const
