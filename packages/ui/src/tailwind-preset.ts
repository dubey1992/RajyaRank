import type { Config } from 'tailwindcss';

/**
 * Shared Tailwind preset. Both apps extend this so colors, radii, and the
 * Devanagari-aware font stack read as one system.
 */
const preset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        navy: {
          100: '#eaf3f8',
          800: '#12476f',
          900: '#0b2f4f',
          950: '#071f35',
        },
        orange: {
          100: '#ffedd5',
          500: '#f97316',
          600: '#ea580c',
        },
        teal: {
          100: '#ddf7f1',
          500: '#0ea58a',
          600: '#0f8b78',
        },
        ink: '#102235',
        muted: '#607286',
        line: '#dfe8ee',
        'surface-soft': '#f6f9fb',
        success: '#15803d',
        danger: '#be123c',
        warning: '#b45309',
      },
      borderRadius: {
        sm: '10px',
        md: '14px',
        lg: '22px',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        deva: ['Noto Sans Devanagari', 'Inter', 'ui-sans-serif', 'sans-serif'],
      },
    },
  },
};

export default preset;
