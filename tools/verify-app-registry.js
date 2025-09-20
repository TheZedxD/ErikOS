import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const registryPath = path.join(projectRoot, 'data/app-registry.json');
const appsDir = path.join(projectRoot, 'src/js/apps');

function normalizeResourcePath(value) {
  return value?.replace(/^\/+/, '') ?? '';
}

function normalizeTitle(value) {
  return (value ?? '').replace(/\u00a0/g, ' ').trim();
}

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function importModule(modulePath) {
  const url = pathToFileURL(modulePath).href;
  return import(url);
}

async function main() {
  const errors = [];
  let registry;

  try {
    const raw = await fs.readFile(registryPath, 'utf8');
    registry = JSON.parse(raw);
    if (!Array.isArray(registry)) {
      throw new Error('Registry JSON must be an array.');
    }
  } catch (err) {
    console.error('Failed to load app registry:', err.message);
    process.exit(1);
  }

  const registryById = new Map();
  const importedModules = new Map();

  for (const entry of registry) {
    if (!entry || typeof entry !== 'object') {
      errors.push('Registry entries must be objects.');
      continue;
    }
    if (!entry.id || typeof entry.id !== 'string') {
      errors.push('Registry entry missing string id.');
      continue;
    }
    if (registryById.has(entry.id)) {
      errors.push(`Duplicate registry entry for id "${entry.id}".`);
      continue;
    }
    registryById.set(entry.id, entry);

    if (entry.comingSoon !== false) {
      errors.push(`Registry entry ${entry.id} must have comingSoon:false.`);
    }

    const title = normalizeTitle(entry.title);
    if (!title) {
      errors.push(`Registry entry ${entry.id} must have a non-empty title.`);
    }

    const iconPath = path.join(projectRoot, normalizeResourcePath(entry.icon));
    if (!entry.icon || typeof entry.icon !== 'string' || !(await fileExists(iconPath))) {
      errors.push(`Icon missing for registry entry ${entry.id}: ${entry.icon ?? '<none>'}`);
    }

    if (!entry.entry || typeof entry.entry !== 'string') {
      errors.push(`Registry entry ${entry.id} missing entry path.`);
      continue;
    }

    const modulePath = path.join(projectRoot, normalizeResourcePath(entry.entry));
    if (!(await fileExists(modulePath))) {
      errors.push(`Module file not found for registry entry ${entry.id}: ${entry.entry}`);
      continue;
    }

    try {
      const mod = await importModule(modulePath);
      importedModules.set(modulePath, mod);
      const openFn = typeof mod.default === 'function' ? mod.default : mod.launch;
      if (typeof openFn !== 'function') {
        errors.push(`Module ${entry.entry} must export a default function or launch().`);
      }

      if (!mod.meta || typeof mod.meta !== 'object') {
        errors.push(`Module ${entry.entry} must export a meta object.`);
      } else {
        if (mod.meta.id && mod.meta.id !== entry.id) {
          errors.push(
            `Registry id ${entry.id} does not match module meta id ${mod.meta.id} in ${entry.entry}.`,
          );
        }
        const metaTitle = normalizeTitle(mod.meta.name);
        const registryTitle = title;
        if (metaTitle && registryTitle && metaTitle !== registryTitle) {
          errors.push(
            `Registry title for ${entry.id} differs from module meta name (${entry.title} vs ${mod.meta.name}).`,
          );
        }
        const metaIcon = normalizeResourcePath(mod.meta.icon);
        const regIcon = normalizeResourcePath(entry.icon);
        if (metaIcon && regIcon && metaIcon !== regIcon) {
          errors.push(
            `Registry icon for ${entry.id} (${entry.icon}) does not match module meta icon (${mod.meta.icon}).`,
          );
        }
      }
    } catch (err) {
      errors.push(`Failed to import module for ${entry.id}: ${err.message}`);
    }
  }

  const files = await fs.readdir(appsDir);
  for (const file of files) {
    if (!file.endsWith('.js') || file === 'index.js') continue;
    const modulePath = path.join(appsDir, file);
    let mod;
    try {
      mod = importedModules.get(modulePath) ?? (await importModule(modulePath));
    } catch (err) {
      errors.push(`Unable to import app module ${file}: ${err.message}`);
      continue;
    }

    const meta = mod.meta;
    if (!meta || typeof meta !== 'object' || !meta.id) {
      errors.push(`Module ${file} must export meta with an id.`);
      continue;
    }
    if (!registryById.has(meta.id)) {
      errors.push(`Module ${file} (id ${meta.id}) is missing from the registry.`);
    }
    const launch = typeof mod.default === 'function' ? mod.default : mod.launch;
    if (typeof launch !== 'function') {
      errors.push(`Module ${file} must export a default function or launch().`);
    }
    if (meta.icon) {
      const iconPath = path.join(projectRoot, normalizeResourcePath(meta.icon));
      if (!(await fileExists(iconPath))) {
        errors.push(`Icon referenced by module ${file} not found: ${meta.icon}`);
      }
    }
  }

  if (errors.length) {
    console.error('App registry verification failed:');
    for (const err of errors) {
      console.error(' -', err);
    }
    process.exit(1);
  }

  console.log('App registry verification passed.');
}

await main();

