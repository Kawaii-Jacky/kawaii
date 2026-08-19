import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const sourceRoot = join(appRoot, "src-tauri", "icons", "android");
const targetRoot = join(
  appRoot,
  "src-tauri",
  "gen",
  "android",
  "app",
  "src",
  "main",
  "res",
);

if (!existsSync(sourceRoot)) {
  throw new Error(`Android icon source directory is missing: ${sourceRoot}`);
}
if (!existsSync(targetRoot)) {
  throw new Error(
    `Generated Android resources are missing: ${targetRoot}. Run \`tauri android init\` first.`,
  );
}

for (const entry of readdirSync(sourceRoot, { withFileTypes: true })) {
  const source = join(sourceRoot, entry.name);
  const target = join(targetRoot, entry.name);
  if (entry.isDirectory()) {
    mkdirSync(target, { recursive: true });
  }
  cpSync(source, target, { recursive: true, force: true });
}

const requiredIcons = [
  "mipmap-anydpi-v26/ic_launcher.xml",
  "mipmap-mdpi/ic_launcher.png",
  "mipmap-mdpi/ic_launcher_round.png",
  "mipmap-mdpi/ic_launcher_foreground.png",
  "mipmap-xxxhdpi/ic_launcher.png",
  "mipmap-xxxhdpi/ic_launcher_round.png",
  "mipmap-xxxhdpi/ic_launcher_foreground.png",
  "values/ic_launcher_background.xml",
];

for (const relativePath of requiredIcons) {
  const source = join(sourceRoot, relativePath);
  const target = join(targetRoot, relativePath);
  if (!existsSync(source) || !existsSync(target)) {
    throw new Error(`Required Android launcher resource is missing: ${relativePath}`);
  }
  if (!readFileSync(source).equals(readFileSync(target))) {
    throw new Error(`Android launcher resource was not copied exactly: ${relativePath}`);
  }
}

console.log("ASTRA Android launcher icons synchronized from the desktop icon source.");
