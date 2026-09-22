// Ambient type for Vite's `?raw` import suffix, used by the Storybook
// "Design Tokens" docs page to read the generated tokens.css as a string.
declare module '*.css?raw' {
  const content: string;
  export default content;
}
