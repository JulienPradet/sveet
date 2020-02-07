import resolve from "rollup-plugin-node-resolve";
import commonjs from "rollup-plugin-commonjs";
import json from "rollup-plugin-json";
import typescript from "@rollup/plugin-typescript";
import pkg from "./package.json";

const external = [].concat(
  Object.keys(pkg.dependencies),
  Object.keys(pkg.peerDependencies),
  Object.keys(process.binding("natives")),
  ["rxjs/operators", "graphql/language/parser"]
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
    typescript()
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
  external,
  plugins: [
    json(),
    resolve({
      extensions: [".mjs", ".js", ".ts"]
    }),
    commonjs(),
    typescript()
  ]
});

export default [
  makeNodeConfig("src/cli.ts", "dist"),
  makeNodeConfig(
    ["src/scripts/start.ts", "src/scripts/build.ts"],
    "dist/scripts"
  ),
  makeClientConfig("src/DevClient.ts", "dist"),
  makeClientConfig("graphql.ts", ".")
];
