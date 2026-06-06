/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        surface: 'var(--surface)',
        sidebar: 'var(--sidebar)',
        sidebarText: 'var(--sidebar-text)',
        primary: {
          DEFAULT: 'var(--primary)',
          hover: 'var(--primary-hover)'
        },
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)'
        },
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
        textPrimary: 'var(--text-primary)',
        textSecondary: 'var(--text-secondary)',
        borderColor: 'var(--border-color)'
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
