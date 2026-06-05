/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#F8FAFC',
        surface: '#FFFFFF',
        sidebar: '#090D1F',
        sidebarText: '#8F9CAE',
        primary: {
          DEFAULT: '#4F46E5',
          hover: '#4338CA'
        },
        accent: {
          DEFAULT: '#0D9488',
          hover: '#0F766E'
        },
        success: '#10B981',
        warning: '#F59E0B',
        danger: '#EF4444',
        textPrimary: '#0F172A',
        textSecondary: '#475569',
        borderColor: '#E2E8F0'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      borderRadius: {
        card: '14px',
        input: '10px',
        button: '10px',
        badge: '20px'
      },
      boxShadow: {
        custom: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
        card: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05)',
        glow: '0 0 15px rgba(79, 70, 229, 0.15)',
        'glow-accent': '0 0 15px rgba(13, 148, 136, 0.15)'
      }
    },
  },
  plugins: [],
}
