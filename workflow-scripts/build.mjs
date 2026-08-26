#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export const buildMatrix = {
  include: [
    {
      target_host: "x86_64-unknown-linux-musl",
      binary_suffix: "-linux-amd64",
      runner: "ubuntu-latest",
    },
    {
      target_host: "aarch64-unknown-linux-musl",
      binary_suffix: "-linux-arm64",
      runner: "ubuntu-latest",
    },
  ],
};

export function releaseAssetNames(matrix = buildMatrix) {
  return matrix.include.map(({ binary_suffix: suffix }) => `gh-plz${suffix}`).sort();
}

export function publishMatrix(outputFile = process.env.GITHUB_OUTPUT) {
  const serialized = JSON.stringify(buildMatrix);
  if (outputFile) {
    fs.appendFileSync(outputFile, `matrix=${serialized}\n`);
    console.log(`Published a ${buildMatrix.include.length}-target release build matrix.`);
  } else {
    console.log(serialized);
  }
}

export function validateReleaseAssets({ distRoot = "dist", matrix = buildMatrix } = {}) {
  if (!fs.existsSync(distRoot)) {
    throw new Error(`Expected ${distRoot} to contain the precompiled release binaries.`);
  }

  const expected = releaseAssetNames(matrix);
  const actual = fs.readdirSync(distRoot).sort();
  const missing = expected.filter((name) => !actual.includes(name));
  const unexpected = actual.filter((name) => !expected.includes(name));
  if (missing.length > 0 || unexpected.length > 0) {
    throw new Error(
      [
        missing.length > 0 ? `missing: ${missing.join(", ")}` : null,
        unexpected.length > 0 ? `unexpected: ${unexpected.join(", ")}` : null,
      ]
        .filter(Boolean)
        .join("; "),
    );
  }

  for (const name of expected) {
    const assetPath = path.join(distRoot, name);
    const metadata = fs.lstatSync(assetPath);
    if (!metadata.isFile()) {
      throw new Error(`Expected ${assetPath} to be a regular file.`);
    }
    if (metadata.size === 0) {
      throw new Error(`Expected ${assetPath} to be non-empty.`);
    }
    if (!name.endsWith(".exe")) {
      fs.chmodSync(assetPath, 0o755);
    }
  }

  console.log(`Validated ${expected.length} precompiled release binaries.`);
  return expected;
}

function main() {
  const [command, ...extraArguments] = process.argv.slice(2);
  if (command === "matrix") {
    if (extraArguments.length > 0) {
      throw new Error("The matrix command does not accept additional arguments.");
    }
    publishMatrix();
    return;
  }

  if (!command || extraArguments.length > 0) {
    throw new Error(
      "Pass either the matrix command or the release tag supplied by gh-extension-precompile.",
    );
  }

  validateReleaseAssets();
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
