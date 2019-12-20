import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import json from "rollup-plugin-json";
import sucrase from "rollup-plugin-sucrase";
import pkg from "./package.json";

const external = [].concat(
  Object.keys(pkg.dependencies),
  Object.keys(process.binding("natives"))
);

const makeNodeConfig = (input, outputDir) => ({
  input: input,
  output: {
    dir: outputDir,
    format: "cjs",
    sourcemap: true,
    chunkFileNames: "[name].js"
  },
  external,
  plugins: [
    json(),
    resolve({
      extensions: [".mjs", ".js", ".ts"]
    }),
    commonjs(),
    sucrase({
      transforms: ["typescript"]
    })
  ]
});

const makeClientConfig = (input, outputDir) => ({
  input: input,
  output: {
    dir: outputDir,
    format: "esm",
    sourcemap: true,
    chunkFileNames: "[name].js"
  },
  plugins: [
    json(),
    resolve({
      extensions: [".mjs", ".js", ".ts"]
    }),
    commonjs(),
    sucrase({
      transforms: ["typescript"]
    })
  ]
});

export default [
  makeNodeConfig("src/cli.ts", "dist"),
  makeNodeConfig(["src/scripts/start.ts"], "dist/scripts"),
  makeClientConfig("src/DevClient.ts", "dist")
];
