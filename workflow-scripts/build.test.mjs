import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildMatrix,
  publishMatrix,
  releaseAssetNames,
  validateReleaseAssets,
} from "./build.mjs";

function temporaryDirectory(context) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "release-build-"));
  context.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

test("publishes the matrix as a GitHub Actions output", (context) => {
  const root = temporaryDirectory(context);
  const outputFile = path.join(root, "output");

  publishMatrix(outputFile);

  assert.equal(fs.readFileSync(outputFile, "utf8"), `matrix=${JSON.stringify(buildMatrix)}\n`);
});

test("validates release assets and restores executable permissions", (context) => {
  const distRoot = temporaryDirectory(context);
  for (const name of releaseAssetNames()) {
    const assetPath = path.join(distRoot, name);
    fs.writeFileSync(assetPath, "binary");
    fs.chmodSync(assetPath, 0o644);
  }

  assert.deepEqual(validateReleaseAssets({ distRoot }), releaseAssetNames());
  for (const name of releaseAssetNames()) {
    assert.equal(fs.statSync(path.join(distRoot, name)).mode & 0o777, 0o755);
  }
});

test("rejects missing, unexpected, and empty release assets", (context) => {
  const distRoot = temporaryDirectory(context);
  fs.writeFileSync(path.join(distRoot, "gh-plz-linux-amd64"), "");
  fs.writeFileSync(path.join(distRoot, "notes.txt"), "unexpected");

  assert.throws(
    () => validateReleaseAssets({ distRoot }),
    /missing: gh-plz-linux-arm64; unexpected: notes\.txt/u,
  );

  fs.writeFileSync(path.join(distRoot, "gh-plz-linux-arm64"), "binary");
  fs.rmSync(path.join(distRoot, "notes.txt"));
  assert.throws(
    () => validateReleaseAssets({ distRoot }),
    /Expected .*gh-plz-linux-amd64 to be non-empty/u,
  );
});
