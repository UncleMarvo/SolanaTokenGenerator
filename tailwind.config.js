/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",

    // Or if using `src` directory:
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        fg: 'var(--fg)',
        muted: 'var(--muted)',
        primary: { DEFAULT: 'var(--primary)', 600: 'var(--primary-600)' },
        secondary: { DEFAULT: 'var(--secondary)', 600: 'var(--secondary-600)' },
        accent: 'var(--accent)',
        danger: 'var(--danger)',
        success: 'var(--success)',
      }
    },
  },
  plugins: [],
};
