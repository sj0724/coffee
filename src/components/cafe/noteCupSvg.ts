import { fromByteArray } from 'base64-js';

export function createNoteCupSvg(colors: string[]): string {
  const validColors = colors.filter((color) => /^#[0-9a-f]{6}$/i.test(color));
  const palette = validColors.length ? validColors : ['#D8DADE'];
  const stops = palette.length > 1 ? palette : [palette[0], palette[0]];

  return `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="72" viewBox="0 0 80 72">
  <defs>
    <linearGradient id="cup" x1="0" y1="18" x2="0" y2="68" gradientUnits="userSpaceOnUse">
      ${stops.map((color, index) => `<stop offset="${index / (stops.length - 1)}" stop-color="${color}"/>`).join('')}
    </linearGradient>
  </defs>
  <path d="M22 18Q40 14 58 18C58 28 66 35 65 46C64 56 57 64 50 68H30C23 64 16 56 15 46C14 35 22 28 22 18Z" fill="url(#cup)"/>
  <path d="M25 20Q40 24 55 20" fill="none" stroke="#FFFFFF" stroke-opacity="0.5" stroke-width="1.5" stroke-linecap="round"/>
</svg>`;
}

export function createNoteCupUri(colors: string[]): string {
  const svg = createNoteCupSvg(colors);
  // The template and validated hex colors are ASCII; base64 data URIs work on both native platforms.
  const bytes = Uint8Array.from(svg, (character) => character.charCodeAt(0));
  return `data:image/svg+xml;base64,${fromByteArray(bytes)}`;
}
