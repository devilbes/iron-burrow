// Options of the skin gallery (tests/skin-gallery.mjs): which views and sizes a run draws, and
// whether it is the full run (every view in every size of SIZES) or a partial one. A partial run
// is for looking at the views just changed; it never counts as the acceptance run.
//   --only shop,daily     (or VIEWS=shop,daily)        only these views
//   --size 844x390        (or SIZES=844x390,390x844)   only these sizes
//   --jobs 4              (or JOBS=4)                  pages drawing at once

/** Sizes of the full run: phone portrait, phone landscape, desktop. */
export const SIZES = [[390, 844], [844, 390], [1280, 720]];

const list = (value) => value.split(',').map((part) => part.trim()).filter(Boolean);

function size(text) {
  const match = /^(\d+)x(\d+)$/.exec(text);
  if (!match || !+match[1] || !+match[2]) throw new Error(`size "${text}" is not <width>x<height>, e.g. 844x390`);
  return [+match[1], +match[2]];
}

/** Options from the command line and the environment (the command line wins). */
export function galleryOptions(argv, env) {
  const given = { only: [], size: [], jobs: [] };
  for (let i = 0; i < argv.length; i++) {
    const [flag, inline] = argv[i].split(/=(.*)/s);
    const name = /^--(only|size|jobs)$/.exec(flag)?.[1];
    if (!name) throw new Error(`unknown option ${argv[i]} (known: --only <views>, --size <width>x<height>, --jobs <n>)`);
    const value = inline ?? argv[++i];
    if (!value || value.startsWith('--')) throw new Error(`${flag} needs a value`);
    given[name].push(value);
  }
  // Repeated: `--only shop --only daily` is `--only shop,daily`.
  const only = given.only.join(',') || env.VIEWS;
  const sizes = given.size.join(',') || env.SIZES;
  const count = given.jobs.at(-1) ?? (env.JOBS || undefined);
  const jobs = count === undefined ? undefined : Number(count);
  if (jobs !== undefined && (!Number.isInteger(jobs) || jobs < 1)) throw new Error(`jobs "${count}" is not a whole number from 1`);
  return { only: only ? [...new Set(list(only))] : undefined,
    sizes: sizes ? [...new Set(list(sizes))].map(size) : undefined, jobs, strict: env.SKIN_STRICT === '1' };
}

/** What a run draws: `partial` unless it is every view of the gallery in every size of SIZES. */
export function galleryPlan(options, allViews) {
  const unknown = (options.only ?? []).filter((view) => !allViews.includes(view));
  if (unknown.length) throw new Error(`no such view: ${unknown.join(', ')} (views: ${allViews.join(', ')})`);
  // In the gallery's own order, whatever the order asked: reports of two runs compare line by line.
  const views = options.only ? allViews.filter((view) => options.only.includes(view)) : allViews;
  const sizes = options.sizes ?? SIZES;
  const key = (each) => each.join('x');
  const everySize = SIZES.every((each) => sizes.some((other) => key(other) === key(each))) && sizes.length === SIZES.length;
  return { views, sizes, partial: views.length !== allViews.length || !everySize };
}

/** The last line and the exit code of a run. A partial run never says PASS; a strict one never exits 0. */
export function galleryVerdict({ partial, strict, problems }) {
  if (problems) return { word: partial ? 'FAILED (partial run)' : 'FAILED', code: 1 };
  if (!partial) return { word: 'PASS', code: 0 };
  return { word: 'PARTIAL RUN, not the acceptance (run all views in all sizes before finishing)', code: strict ? 2 : 0 };
}

/**
 * Options of the single screen shot (tests/screen-shot.mjs): one route of the game in one size.
 *   --route game          a route of src/screens/index.ts (default home)
 *   --size 844x390        one size (default 390x844)
 *   --level 3             the level the test level services answer with (default 1)
 *   --watch               keep the browser, draw again after every change of src/, assets/, index.html
 */
export function shotOptions(argv) {
  const given = { route: 'home', size: '390x844', level: '1', watch: false };
  for (let i = 0; i < argv.length; i++) {
    const [flag, inline] = argv[i].split(/=(.*)/s);
    if (flag === '--watch' && inline === undefined) { given.watch = true; continue; }
    const name = /^--(route|size|level)$/.exec(flag)?.[1];
    if (!name) throw new Error(`unknown option ${argv[i]} (known: --route <route>, --size <width>x<height>, --level <n>, --watch)`);
    const value = inline ?? argv[++i];
    if (!value || value.startsWith('--')) throw new Error(`${flag} needs a value`);
    given[name] = value;
  }
  if (given.size.includes(',')) throw new Error(`one size per shot, e.g. 844x390 (every size at once is the gallery: tests/skin-gallery.mjs)`);
  if (!/^[\w-]+$/.test(given.route)) throw new Error(`route "${given.route}" is not a route name of src/screens/index.ts`);
  const level = Number(given.level);
  if (!Number.isInteger(level) || level < 1) throw new Error(`level "${given.level}" is not a whole number from 1`);
  return { route: given.route, size: size(given.size), level, watch: given.watch };
}
