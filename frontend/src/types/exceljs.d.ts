// The published `exceljs` entry pulls Node builtins; the pre-bundled browser build
// is the one Vite can serve, so it needs its own module declaration.
declare module 'exceljs/dist/exceljs.min.js' {
  const ExcelJS: typeof import('exceljs');
  export default ExcelJS;
}
