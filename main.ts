// Leonida Trophy Atlas — the hand-in step for gta6-trophy-guide-01.
// Node standard library only. It mirrors the starter's plumbing: copy the app and the
// screenshots beside this file into the output directory, then write dossier.json with
// the vendored make.fun library, using the scorer's own caps. The judge runs this file;
// the app itself is plain static files under app/ (index.html + app.js + style.css +
// data/*.json), served locally by serve.ts and opened at app/index.html.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's caps: only text_max_bytes shapes the bytes; the rest refuse an entry
// the scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993
// files and directories in app/ or 48 MiB of app files).
const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
};

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

writeFileSync(join(out, 'dossier.json'), buildDossier(out, caps));
console.log('Leonida Trophy Atlas: app/ + screenshots/ copied to the output dir and dossier.json written.');
