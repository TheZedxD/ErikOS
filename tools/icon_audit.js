#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const registryPath = path.join(projectRoot, 'data/app-registry.json');
const iconsDir = path.join(projectRoot, 'icons');
const sizes = [16, 32, 48];
const retinaSize = 96;
const fallbackEnv = process.env.ICON_AUDIT_FALLBACK || 'start.png';
const fallbackRelative = fallbackEnv.replace(/^\/+/, '');
const fallbackPath = fallbackRelative.startsWith('icons/')
  ? path.join(projectRoot, fallbackRelative)
  : path.join(iconsDir, fallbackRelative);

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

async function resizeWithSharp(sharp, source, size, target) {
  await sharp(source)
    .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(target);
}

async function resizeWithCanvas(canvasMod, source, size, target) {
  const { createCanvas, loadImage } = canvasMod;
  const img = await loadImage(source);
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(img, 0, 0, size, size);
  const buffer = canvas.toBuffer('image/png');
  await fs.promises.writeFile(target, buffer);
}

function resizeWithPython(source, size, target) {
  const python = process.env.PYTHON || process.env.PYTHON3 || 'python3';
  const script = `from PIL import Image\nimport sys\nsrc, size, dest = sys.argv[1], int(sys.argv[2]), sys.argv[3]\nimg = Image.open(src).convert('RGBA')\nimg = img.resize((size, size), Image.LANCZOS)\nimg.save(dest)\n`;
  return new Promise((resolve, reject) => {
    const proc = spawn(python, ['-c', script, source, String(size), target], {
      stdio: ['ignore', 'ignore', 'inherit'],
    });
    proc.on('error', reject);
    proc.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Python exited with code ${code}`));
    });
  });
}

async function createResizer() {
  try {
    const sharpMod = await import('sharp');
    const sharpFn = sharpMod.default || sharpMod;
    return async (source, size, target) => resizeWithSharp(sharpFn, source, size, target);
  } catch (err) {
    try {
      const canvasMod = await import('canvas');
      return async (source, size, target) => resizeWithCanvas(canvasMod, source, size, target);
    } catch (err2) {
      return async (source, size, target) => resizeWithPython(source, size, target);
    }
  }
}

function readRegistry() {
  const raw = fs.readFileSync(registryPath, 'utf-8');
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error('Registry JSON must be an array');
  return data;
}

async function main() {
  const registry = readRegistry();
  ensureDir(iconsDir);
  const resizer = await createResizer();
  const missing = [];
  const generated = [];
  const warnings = [];
  const fallbackEntries = new Set();

  if (!fs.existsSync(fallbackPath)) {
    missing.push(`Fallback icon not found: ${path.relative(projectRoot, fallbackPath)}`);
  }

  for (const entry of registry) {
    if (!entry || typeof entry.icon !== 'string') continue;
    const rawPath = entry.icon.replace(/^\//, '');
    const relativeIcon = rawPath.startsWith('icons/') ? rawPath : path.join('icons', rawPath);
    const source = path.join(projectRoot, relativeIcon);
    const baseName = path.basename(relativeIcon);
    if (!fs.existsSync(source)) {
      fallbackEntries.add(baseName);
      warnings.push(`Using fallback icon for ${entry.id || entry.icon}: ${entry.icon}`);
      continue;
    }
    for (const size of sizes) {
      const targetDir = path.join(iconsDir, String(size));
      ensureDir(targetDir);
      const target = path.join(targetDir, baseName);
      if (!fs.existsSync(target)) {
        await resizer(source, size, target);
        generated.push(target);
      }
    }
    const retinaDir = path.join(iconsDir, String(retinaSize));
    ensureDir(retinaDir);
    const retinaTarget = path.join(retinaDir, baseName);
    if (!fs.existsSync(retinaTarget)) {
      await resizer(source, retinaSize, retinaTarget);
      generated.push(retinaTarget);
    }
  }

  let errors = false;
  for (const entry of registry) {
    if (!entry || typeof entry.icon !== 'string') continue;
    const baseName = path.basename(entry.icon);
    if (fallbackEntries.has(baseName)) continue;
    for (const size of [...sizes, retinaSize]) {
      const checkPath = path.join(iconsDir, String(size), baseName);
      if (!fs.existsSync(checkPath)) {
        missing.push(`Missing generated icon ${size}px for ${entry.icon}`);
        errors = true;
      }
    }
  }

  generated.forEach((file) => {
    console.log(`Generated ${path.relative(projectRoot, file)}`);
  });

  warnings.forEach((msg) => console.warn(msg));

  if (missing.length) {
    missing.forEach((msg) => console.error(msg));
    process.exitCode = 1;
    return;
  }

  if (errors) {
    process.exitCode = 1;
    return;
  }
  console.log('Icon audit complete');
}

main().catch((err) => {
  console.error('Icon audit failed:', err.message || err);
  process.exitCode = 1;
});
