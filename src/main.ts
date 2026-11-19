// Точка входа игры. Ядро SDK и модули приходят в vendor/@manygamescorp через MCP
// (sdk.modules_install) и подключаются по import map: см. docs/sdk/core.md.
// Пока SDK не установлен, страница показывает заглушку.
const root = document.getElementById('app');

async function start(): Promise<void> {
  const platformConfig = await (await fetch('./platform.json')).json();
  const kernel = '@manygamescorp/core/kernel';
  let createSdk: ((config: unknown) => { boot(): Promise<void>; state: string }) | undefined;
  try {
    ({ createSdk } = await import(kernel));
  } catch {
    if (root) root.textContent = 'SDK не установлен: выберите модули в Студии (sdk.modules_install).';
    return;
  }
  const sdk = createSdk!({ modules: [], platformConfig, http: { appVersion: '1.0.0' } });
  await sdk.boot();
  if (root) root.textContent = `SDK: ${sdk.state}`;
}

void start();
