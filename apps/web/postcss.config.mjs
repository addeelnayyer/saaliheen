// Tailwind v4 (#298, ADR 0067): its PostCSS plugin compiles the
// `@import "tailwindcss"` at the top of src/app/globals.css.
const config = {
  plugins: { "@tailwindcss/postcss": {} },
};

export default config;
