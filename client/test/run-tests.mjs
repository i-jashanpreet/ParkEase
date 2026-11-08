/* global console, process */
import esbuild from "esbuild";
import { execSync } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testEntry = path.join(__dirname, "components.test.js");
const tempOut = path.join(__dirname, ".components.test.bundle.mjs");

try {
  await esbuild.build({
    entryPoints: [testEntry],
    bundle: true,
    format: "esm",
    platform: "node",
    jsx: "automatic",
    outfile: tempOut,
    external: [
      "node:test",
      "node:assert/strict",
      "react",
      "react-dom",
      "react-router-dom",
    ],
  });

  const output = execSync(`node --test "${tempOut}"`, {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });

  console.log(output);
} catch (error) {
  if (error.stdout) console.log(error.stdout);
  if (error.stderr) console.error(error.stderr);
  process.exitCode = error.status || 1;
} finally {
  if (fs.existsSync(tempOut)) {
    fs.unlinkSync(tempOut);
  }
}
