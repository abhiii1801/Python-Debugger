/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base backgrounds
        'bg-base': '#0D0D0F',
        'bg-surface': '#141416',
        'bg-elevated': '#1A1A1E',
        'bg-console': '#0A0A0C',
        // Borders
        'border-subtle': '#1E1E22',
        'border-muted': '#2A2A30',
        // Accent
        'accent': '#7C6DFA',
        'accent-hover': '#9183FB',
        'accent-dim': 'rgba(124, 109, 250, 0.15)',
        // Semantic
        'success': '#34D399',
        'warning': '#FBBF24',
        'error': '#F87171',
        'info': '#60A5FA',
        // Text
        'text-primary': '#E4E4E7',
        'text-secondary': '#A1A1AA',
        'text-muted': '#71717A',
        // Type badge colors
        'type-int': '#60A5FA',
        'type-float': '#A78BFA',
        'type-bool': '#34D399',
        'type-str': '#FBBF24',
        'type-list': '#F97316',
        'type-dict': '#EC4899',
        'type-set': '#8B5CF6',
        'type-tuple': '#06B6D4',
        'type-instance': '#10B981',
        'type-none': '#6B7280',
        'type-func': '#F59E0B',
      },
      fontFamily: {
        'mono': ['"JetBrains Mono"', 'Fira Code', 'Consolas', 'monospace'],
        'ui': ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'card': '8px',
        'sm': '4px',
      },
      backdropBlur: {
        'xs': '2px',
      },
      transitionDuration: {
        '150': '150ms',
        '300': '300ms',
      },
      boxShadow: {
        'glow-accent': '0 0 20px rgba(124, 109, 250, 0.2)',
        'glow-success': '0 0 20px rgba(52, 211, 153, 0.2)',
        'card': '0 4px 24px rgba(0,0,0,0.4)',
      },
    },
  },
  plugins: [],
}
