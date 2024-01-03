import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

export default {
  input: "src/script_getRecipe_quickadd.js",
  output: {
    file: "dist/script_getRecipe_quickadd.js",
    format: "cjs",
  },
  plugins: [
    commonjs(),
    resolve({})
  ],
};
