module.exports = {
  content: [
    "./pages/*.{html,js}",
    "./index.html",
    "./js/*.js",
    "./components/*.html"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Primary Colors
        primary: {
          DEFAULT: "#0066cc", // blue-600
          50: "#e6f2ff", // blue-50
          100: "#b3d9ff", // blue-100
          500: "#0066cc", // blue-600
          600: "#0052a3", // blue-700
          700: "#003d7a", // blue-800
        },
        // Secondary Colors
        secondary: {
          DEFAULT: "#1a1a2e", // slate-900
          50: "#f8f9fa", // slate-50
          100: "#e9ecef", // slate-100
          800: "#1a1a2e", // slate-900
          900: "#0d1117", // slate-950
        },
        // Accent Colors
        accent: {
          DEFAULT: "#28a745", // green-600
          50: "#f0f9f4", // green-50
          100: "#dcf4e3", // green-100
          500: "#28a745", // green-600
          600: "#1e7e34", // green-700
        },
        // Background Colors
        background: {
          DEFAULT: "#ffffff", // white
          dark: "#0d1117", // slate-950
        },
        surface: {
          DEFAULT: "#f8f9fa", // gray-50
          dark: "#1a1a2e", // slate-900
        },
        // Text Colors
        'text-primary': {
          DEFAULT: "#212529", // gray-900
          dark: "#ffffff", // white
        },
        'text-secondary': {
          DEFAULT: "#6c757d", // gray-600
          dark: "#9ca3af", // gray-400
        },
        // Status Colors
        success: {
          DEFAULT: "#28a745", // green-600
          50: "#f0f9f4", // green-50
        },
        warning: {
          DEFAULT: "#ffc107", // yellow-500
          50: "#fffbeb", // yellow-50
        },
        error: {
          DEFAULT: "#dc3545", // red-600
          50: "#fef2f2", // red-50
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'monospace'],
        inter: ['Inter', 'sans-serif'],
        jetbrains: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'responsive-xl': ['clamp(2rem, 5vw, 3rem)', { lineHeight: '1.2' }],
        'responsive-lg': ['clamp(1.5rem, 4vw, 2rem)', { lineHeight: '1.3' }],
        'responsive-md': ['clamp(1.125rem, 3vw, 1.25rem)', { lineHeight: '1.4' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },
      boxShadow: {
        'light': '0 2px 8px rgba(0, 0, 0, 0.1)',
        'dark': '0 2px 8px rgba(255, 255, 255, 0.05)',
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'card-dark': '0 4px 6px -1px rgba(255, 255, 255, 0.05), 0 2px 4px -1px rgba(255, 255, 255, 0.03)',
        'hover': '0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'hover-dark': '0 10px 25px -3px rgba(255, 255, 255, 0.05), 0 4px 6px -2px rgba(255, 255, 255, 0.03)',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'slide-up': 'slideUp 0.6s ease-out forwards',
        'typing': 'typing 3.5s steps(40, end), blink-caret 0.75s step-end infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-subtle': 'bounceSubtle 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': {
            opacity: '0',
            transform: 'translateY(20px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        slideUp: {
          '0%': {
            opacity: '0',
            transform: 'translateY(30px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        typing: {
          '0%': { width: '0' },
          '100%': { width: '100%' },
        },
        'blink-caret': {
          '0%, 100%': { borderColor: 'transparent' },
          '50%': { borderColor: '#0066cc' },
        },
        bounceSubtle: {
          '0%, 100%': {
            transform: 'translateY(0)',
            animationTimingFunction: 'cubic-bezier(0.8, 0, 1, 1)',
          },
          '50%': {
            transform: 'translateY(-5px)',
            animationTimingFunction: 'cubic-bezier(0, 0, 0.2, 1)',
          },
        },
      },
      transitionDuration: {
        '200': '200ms',
        '300': '300ms',
        '400': '400ms',
      },
      transitionTimingFunction: {
        'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
        'ease-in-out': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      backdropBlur: {
        xs: '2px',
      },
      screens: {
        'xs': '475px',
        '3xl': '1600px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms')({
      strategy: 'class',
    }),
    require('@tailwindcss/typography'),
  ],
}