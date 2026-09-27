// Publie sur Instagram le carrousel prévu aujourd'hui (API Instagram, connexion Instagram).
// Variables : IG_TOKEN (secret), IG_USER_ID (optionnel, défaut "me"), GRAPH_VERSION (optionnel),
// GITHUB_REPOSITORY / BRANCH (fournis par GitHub Actions), DRY_RUN=1 pour tout vérifier sans publier,
// FOLDER=posts/... pour forcer un post précis (test manuel).
import fs from 'node:fs';
import path from 'node:path';

const TOKEN = process.env.IG_TOKEN;
const USER = process.env.IG_USER_ID || 'me';
const V = process.env.GRAPH_VERSION || 'v23.0';
const REPO = process.env.GITHUB_REPOSITORY;
const BRANCH = process.env.BRANCH || 'main';
const DRY = process.env.DRY_RUN === '1';
const API = `https://graph.instagram.com/${V}`;

const sched = JSON.parse(fs.readFileSync('schedule.json', 'utf8'));
const logFile = 'published.json';
const log = fs.existsSync(logFile) ? JSON.parse(fs.readFileSync(logFile, 'utf8')) : [];
const today = new Intl.DateTimeFormat('en-CA', { timeZone: sched.timezone || 'Europe/Paris' }).format(new Date());

let post;
if (process.env.FOLDER) post = sched.posts.find(p => p.folder === process.env.FOLDER) || { folder: process.env.FOLDER, approved: true };
else post = sched.posts.find(p => p.date === today && p.approved && !log.some(l => l.folder === p.folder));

if (!post) { console.log(`Rien à publier le ${today}.`); process.exit(0); }
if (!post.approved && !DRY) { console.log(`${post.folder} n'est pas validé : on ne publie pas.`); process.exit(0); }
if (log.some(l => l.folder === post.folder)) { console.log(`${post.folder} déjà publié.`); process.exit(0); }

const imgs = fs.readdirSync(post.folder).filter(f => /\.jpe?g$/i.test(f)).sort();
const caption = fs.readFileSync(path.join(post.folder, 'caption.txt'), 'utf8').trim();
if (imgs.length < 2 || imgs.length > 10) throw new Error(`Un carrousel doit avoir 2 à 10 images (trouvé ${imgs.length}).`);
const urls = imgs.map(f => `https://raw.githubusercontent.com/${REPO}/${BRANCH}/${post.folder}/${f}`);
console.log(`Post : ${post.folder}\n${urls.length} images\nLégende : ${caption.length} caractères`);

// Les images doivent être accessibles publiquement pour qu'Instagram les récupère.
for (const u of urls) {
  const r = await fetch(u, { method: 'HEAD' });
  if (!r.ok) throw new Error(`Image inaccessible (${r.status}) : ${u}`);
}
if (DRY) { console.log('DRY_RUN : tout est prêt, rien n’a été publié.'); process.exit(0); }
if (!TOKEN) throw new Error('Secret IG_TOKEN manquant.');

async function call(method, endpoint, params = {}) {
  const body = new URLSearchParams({ ...params, access_token: TOKEN });
  const url = method === 'GET' ? `${API}/${endpoint}?${body}` : `${API}/${endpoint}`;
  const r = await fetch(url, method === 'GET' ? {} : { method, body });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(`${endpoint} : ${JSON.stringify(j.error || j)}`);
  return j;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function waitReady(id) {
  for (let i = 0; i < 30; i++) {
    const { status_code } = await call('GET', id, { fields: 'status_code' });
    if (status_code === 'FINISHED') return;
    if (status_code === 'ERROR' || status_code === 'EXPIRED') throw new Error(`Conteneur ${id} : ${status_code}`);
    await sleep(4000);
  }
  throw new Error(`Conteneur ${id} toujours pas prêt.`);
}

const children = [];
for (const u of urls) {
  const { id } = await call('POST', `${USER}/media`, { image_url: u, is_carousel_item: 'true' });
  children.push(id);
}
for (const id of children) await waitReady(id);
const { id: carousel } = await call('POST', `${USER}/media`, { media_type: 'CAROUSEL', children: children.join(','), caption });
await waitReady(carousel);
const { id: mediaId } = await call('POST', `${USER}/media_publish`, { creation_id: carousel });
const { permalink } = await call('GET', mediaId, { fields: 'permalink' }).catch(() => ({}));
console.log(`Publié : ${permalink || mediaId}`);

log.push({ folder: post.folder, date: today, media_id: mediaId, permalink: permalink || null, at: new Date().toISOString() });
fs.writeFileSync(logFile, JSON.stringify(log, null, 2) + '\n');
