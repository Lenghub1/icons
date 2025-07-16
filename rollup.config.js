const resolve = require("@rollup/plugin-node-resolve");
const commonjs = require("@rollup/plugin-commonjs");
const babel = require("@rollup/plugin-babel");
const terser = require("@rollup/plugin-terser");
const peerDepsExternal = require("rollup-plugin-peer-deps-external");

module.exports = {
  input: "src/index.js",
  output: [
    {
      file: "dist/index.js",
      format: "cjs",
      exports: "named",
      sourcemap: true,
    },
    {
      file: "dist/index.esm.js",
      format: "esm",
      exports: "named",
      sourcemap: true,
    },
  ],
  plugins: [
    peerDepsExternal(),
    resolve({
      browser: true,
    }),
    commonjs(),
    babel({
      babelHelpers: "bundled",
      exclude: "node_modules/**",
      presets: [
        ["@babel/preset-env", { targets: { node: "current" } }],
        "@babel/preset-react",
      ],
    }),
    terser.default ? terser.default() : terser(),
  ],
  external: ["react", "react-dom"],
};
