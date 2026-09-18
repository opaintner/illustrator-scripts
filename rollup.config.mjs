import { defineConfig } from "rollup";
import fs from "fs";
import path from "path";



export default defineConfig({
  input: "src/ScreenSepMarks/main.js",
  output: {
    file: "dist/ScreenSepMarks.jsx",
    format: "iife",
    name: "ScreenSepMarks",
    strict: false,
    banner: () => fs.readFileSync("./src/ScreenSepMarks/scriptBanner.txt"),
    generatedCode: {
      preset: "es5"
    }
  }
});