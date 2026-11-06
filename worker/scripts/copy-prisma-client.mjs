import { cpSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const workerDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryDirectory = resolve(workerDirectory, "..");
const generatedClientDirectory = resolve(
  repositoryDirectory,
  "lib",
  "generated",
  "prisma",
);
const distributionClientDirectory = resolve(
  workerDirectory,
  "dist",
  "lib",
  "generated",
  "prisma",
);

cpSync(generatedClientDirectory, distributionClientDirectory, {
  recursive: true,
  force: true,
});
