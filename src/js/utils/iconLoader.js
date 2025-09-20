import { ASSET_BASE } from '../../config.js';

const DEFAULT_FALLBACK = 'start.png';

const normalize = (icon) => icon.replace(/^\/+/, '');

const toSrc = (icon) => {
  if (!icon) return null;
  if (icon.startsWith('http')) return icon;
  if (icon.startsWith('/')) return `${ASSET_BASE}/${normalize(icon)}`;
  return `${ASSET_BASE}/${normalize(icon)}`;
};

export const resolveIconSrc = (icon, fallback = DEFAULT_FALLBACK) => {
  return toSrc(icon) ?? toSrc(fallback) ?? `${ASSET_BASE}/${DEFAULT_FALLBACK}`;
};

export function applyIcon(img, icon, options = {}) {
  const { fallback = DEFAULT_FALLBACK } = options;
  const fallbackSrc = resolveIconSrc(fallback);
  const primarySrc = resolveIconSrc(icon, fallback);
  if (primarySrc === fallbackSrc) {
    img.src = fallbackSrc;
    return;
  }
  const handleError = () => {
    if (img.src === fallbackSrc) return;
    img.src = fallbackSrc;
  };
  img.addEventListener('error', handleError, { once: true });
  img.src = primarySrc;
}
