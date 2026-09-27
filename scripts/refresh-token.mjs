// Renouvelle le jeton Instagram longue durée (valable 60 jours) et affiche le nouveau jeton
// sur la sortie standard, pour que le workflow le réenregistre comme secret.
const TOKEN = process.env.IG_TOKEN;
if (!TOKEN) throw new Error('Secret IG_TOKEN manquant.');
const r = await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(TOKEN)}`);
const j = await r.json();
if (!r.ok || !j.access_token) throw new Error(`Renouvellement refusé : ${JSON.stringify(j.error || j)}`);
console.error(`Jeton renouvelé, valable ${Math.round(j.expires_in / 86400)} jours.`);
process.stdout.write(j.access_token);
