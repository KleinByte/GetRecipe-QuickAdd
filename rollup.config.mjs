import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import nodePolyfills from 'rollup-plugin-node-polyfills';

export default {
  input: "recipe-fetcher/index.js",
  output: {
    file: "dist/script_getRecipe_quickadd.js",
    format: "cjs",
  },
  plugins: [
    commonjs(),
    resolve({
      preferBuiltins: true,
    }),
    json(),
    nodePolyfills(),
  ],
};
