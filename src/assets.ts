// Files of the game in assets/ (images, audio, skin art): the build copies the folder to
// dist/assets/, next to dist/app/ where the bundled code runs, so URLs do not depend on the page URL.
const ROOT = new URL('../assets/', import.meta.url);

/** URL of a file in `assets/`, e.g. `assetUrl('images/background.webp')`. */
export function assetUrl(path: string): string {
  return new URL(path, ROOT).href;
}
