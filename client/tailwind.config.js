/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#F8F7F4',
        surface: '#FFFFFF',
        sidebar: '#1A1A2E',
        sidebarText: '#A8A8C0',
        primary: {
          DEFAULT: '#6C63FF',
          hover: '#5A52D5'
        },
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
        textPrimary: '#1A1A2E',
        textSecondary: '#6B7280',
        borderColor: '#E5E4E0'
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif']
      },
      borderRadius: {
        card: '12px',
        input: '8px',
        button: '8px',
        badge: '20px'
      },
      boxShadow: {
        custom: '0 1px 3px rgba(0,0,0,0.06)'
      }
    },
  },
  plugins: [],
}
