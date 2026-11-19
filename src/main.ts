// Entry of the game page. SDK packages are supplied by the platform build and resolved through
// the import map, so this file imports them dynamically: without the SDK the page still shows a
// readable status instead of a blank screen. Everything else is in src/boot/start.ts.
import { bootText } from './boot/strings.js';
import { failureCode, reportFailure } from './boot/errors.js';

const root = document.getElementById('app');
const loader = document.getElementById('preloader');

/** The neutral loading line of index.html; boot/start.ts removes it once the game's loading screen has painted. */
function hideBootLoader(): void {
  const line = document.getElementById('boot-loader');
  if (line) line.hidden = true;
}

function showStatus(container: HTMLElement, message: string): void {
  const title = document.createElement('h1');
  title.id = 'game-title';
  title.textContent = document.title;
  const status = document.createElement('p');
  status.id = 'sdk-status';
  status.role = 'status';
  status.textContent = message;
  container.replaceChildren(title, status);
}

async function main(): Promise<void> {
  if (!root || !loader) return;
  showStatus(root, bootText('shell.status.loading'));
  // Once the boot runs, its failures are shown on the kit loading screen (boot/start.ts).
  let booting = false;
  try {
    const response = await fetch('./platform.json');
    if (!response.ok) throw { code: 'PLATFORM_CONFIG_UNAVAILABLE' };
    const platformConfig: unknown = await response.json();
    const kernel = '@manygamescorp/core/kernel';
    try { await import(kernel); } catch {
      showStatus(root, bootText('shell.status.noSdk'));
      hideBootLoader();
      document.body.dataset['sdkState'] = 'unavailable';
      return;
    }
    // Keep the SDK-dependent graph outside the portable entry's TypeScript program.
    // The platform build checks that graph with tsconfig.sdk.json and the real SDK types and
    // bundles src/boot/start.ts as its own entry next to main.js (scripts/build.mjs).
    const boot = './start.js';
    const { start }: { start(root: HTMLElement, loader: HTMLElement, config: unknown):
      Promise<{ sdk: { readonly state: string }; dispose(): void }> } = await import(boot);
    root.replaceChildren();
    booting = true;
    const game = await start(root, loader, platformConfig);
    window.addEventListener('pagehide', (event) => { if (!event.persisted) game.dispose(); });
    document.body.dataset['sdkState'] = game.sdk.state;
  } catch (error) {
    reportFailure('sdk boot failed', error);
    if (!booting) showStatus(root, bootText('shell.error.boot', { code: failureCode(error) }));
    // A failed boot shows its error on the game's loading screen; before it, the status above.
    hideBootLoader();
    document.body.dataset['sdkState'] = 'error';
  }
}

void main();
