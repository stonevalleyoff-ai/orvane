// Orvane — L'ESSAI DU SUPABASE D'ORVANE (outils/essai-sql.js) — hebergement/LISEZ-MOI.md
// Rejoue hebergement/supabase.sql sur un Postgres jetable, à soi (un dossier temporaire, une prise locale, aucun port ouvert), sans
// jamais toucher au vrai Supabase. Le Postgres reçoit d'abord ce que Supabase a déjà (les rôles anon, authenticated, service_role, le
// schéma extensions, les droits ouverts par défaut sur le schéma public), puis le fichier de la version de référence (--base, main
// par défaut) avec un jeu et un lot, comme la base d'aujourd'hui ; puis le fichier d'ici, deux fois (il doit pouvoir être recollé).
// Ensuite :
//  1. la migration : rien ne change pour un jeu branché (l'appel d'avant, à trois paramètres, est servi ; une seule orvane_deposer) ;
//  2. la clé de dépôt : rendue une fois, seule son empreinte est gardée ; exigée, un dépôt sans elle ou avec une fausse est refusé ;
//  3. les renvois : le même id ne compte qu'une fois, avant les quotas, sans rien consommer ; deux dépôts du même id en même temps ;
//  4. les droits : anon n'ouvre aucune table, ni le schéma privé ; chaque fonction est security definer, à chemin fixé ;
//  5. le client des serveurs (kits/serveur/depot.mjs et depot.cjs), sous Node et sous Deno s'il est là, par une petite API locale
//     qui fait ce que fait PostgREST (le rôle anon, des paramètres nommés) : une réponse perdue, un serveur qui flanche, un délai.
//   node outils/essai-sql.js [--base main] [--deno <chemin de deno>] [--garder]
// Sans Postgres (initdb, pg_ctl, psql : PG_BIN, ou pg_config --bindir), il le dit et s'arrête sans échec. Ce n'est pas un banc
// (outils/bancs.js ne le lance pas) : il demande Postgres. Sortie : 0 si tout passe, 1 sinon.
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), http = require('http'), { spawnSync, spawn, execFileSync } = require('child_process');
const racine = path.join(__dirname, '..');
const a = process.argv.slice(2), arg = (k, d) => { const i = a.indexOf(k); return i >= 0 && a[i + 1] != null ? a[i + 1] : d; };
const base = arg('--base', 'main'), garder = a.includes('--garder');
let ok = true; const verif = (c, m) => { ok = ok && !!c; console.log((c ? '  ✓ ' : '  ✗ ') + m); };

// --- le Postgres jetable ---
const binDe = () => { if (process.env.PG_BIN) return process.env.PG_BIN; try { return execFileSync('pg_config', ['--bindir'], { encoding: 'utf8' }).trim(); } catch (e) { /* rien */ }
  const L = fs.existsSync('/usr/lib/postgresql') ? fs.readdirSync('/usr/lib/postgresql').sort((x, y) => y - x) : []; return L.length ? `/usr/lib/postgresql/${L[0]}/bin` : null; };
const BIN = binDe(), outil = n => BIN && path.join(BIN, n);
if (!BIN || !['initdb', 'pg_ctl', 'psql'].every(n => fs.existsSync(outil(n)))) { console.log('pas de Postgres sur cette machine (initdb, pg_ctl, psql) : essai sauté'); process.exit(0); }
// (Postgres ne tourne pas sous root : sous root, il tourne sous l'utilisateur postgres)
const root = process.getuid?.() === 0, uid = root ? +execFileSync('id', ['-u', 'postgres'], { encoding: 'utf8' }) : null, gid = root ? +execFileSync('id', ['-g', 'postgres'], { encoding: 'utf8' }) : null;
const cmd = (n, args) => root ? ['runuser', ['-u', 'postgres', '--', outil(n), ...args]] : [outil(n), args];
const tmp = fs.mkdtempSync(path.join(root ? '/tmp' : os.tmpdir(), 'orvane-sql-')), donnees = path.join(tmp, 'donnees'), port = String(50000 + (process.pid % 10000));
if (root) fs.chownSync(tmp, uid, gid);
const lancer = (n, args, opt = {}) => { const [c, x] = cmd(n, args); return spawnSync(c, x, { encoding: 'utf8', ...opt }); };
let demarre = false;
const arreter = () => { if (demarre) lancer('pg_ctl', ['-D', donnees, '-m', 'immediate', 'stop']); demarre = false; if (!garder) fs.rmSync(tmp, { recursive: true, force: true }); else console.log(`(gardé : ${tmp})`); };
process.on('exit', arreter); for (const s of ['SIGINT', 'SIGTERM']) process.on(s, () => process.exit(1));   // (interrompu : le Postgres s'arrête quand même)
let r = lancer('initdb', ['-D', donnees, '-U', 'postgres', '-A', 'trust', '-E', 'UTF8', '--locale=C.UTF-8']);
if (r.status !== 0) r = lancer('initdb', ['-D', donnees, '-U', 'postgres', '-A', 'trust', '-E', 'UTF8', '--no-locale']);
if (r.status !== 0) { console.log('initdb : ' + r.stderr); process.exit(1); }
r = lancer('pg_ctl', ['-D', donnees, '-l', path.join(tmp, 'journal'), '-w', '-o', `-c listen_addresses='' -k ${tmp} -p ${port} -c max_connections=40`, 'start']);
if (r.status !== 0) { console.log('pg_ctl : ' + r.stderr + r.stdout); process.exit(1); }
demarre = true;
const ARGS = ['-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-h', tmp, '-p', port, '-U', 'postgres', '-d', 'postgres'];
// une requête ; vars : des variables psql (:'nom' dans le texte, citées par psql : rien de ce qu'on y met ne devient du SQL) ; base : une
// autre base que postgres
function sql(texte, vars = {}, base = null) {
  const v = Object.entries(vars).flatMap(([k, x]) => ['-v', `${k}=${typeof x === 'string' ? x : JSON.stringify(x)}`]);
  const [c, x] = cmd('psql', [...(base ? [...ARGS.slice(0, -1), base] : ARGS), ...v]); const q = spawnSync(c, x, { input: texte, encoding: 'utf8' });
  return { ok: q.status === 0, sortie: q.stdout.trim(), erreur: q.stderr.trim() };
}
const sqlOk = (texte, vars, base) => { const q = sql(texte, vars, base); if (!q.ok) throw new Error(q.erreur); return q.sortie; };
// un appel comme celui de l'API (PostgREST) : le rôle anon, des paramètres nommés, ceux du corps seulement
const TYPES = { p_lot: 'jsonb', p_exposition: 'jsonb', p_exiger: 'boolean', p_apres: 'bigint', p_limite: 'int' };
function rpcSql(fn, corps, { role = 'anon', avant = '', apres = '' } = {}) {
  if (!/^orvane_[a-z_]+$/.test(fn)) return null;
  const cles = Object.keys(corps).filter(k => /^p_[a-z_]+$/.test(k)), vars = Object.fromEntries(cles.map(k => ['v_' + k, corps[k] == null ? '' : typeof corps[k] === 'string' ? corps[k] : JSON.stringify(corps[k])]));
  const args = cles.map(k => `${k} => ${corps[k] == null ? 'null' : `(:'v_${k}')::${TYPES[k] || 'text'}`}`).join(', ');
  return { texte: `${avant}set role ${role}; select public.${fn}(${args});${apres}`, vars };
}
function rpc(fn, corps, opt) { const q = rpcSql(fn, corps, opt), s = sql(q.texte, q.vars, opt?.base); if (!s.ok) return { _erreur: s.erreur }; const l = s.sortie.split('\n').filter(Boolean).pop(); try { return JSON.parse(l); } catch (e) { return { _sortie: s.sortie }; } }
const rpcAsync = (fn, corps, opt) => new Promise(fin => { const q = rpcSql(fn, corps, opt), v = Object.entries(q.vars).flatMap(([k, x]) => ['-v', `${k}=${x}`]), [c, x] = cmd('psql', [...ARGS, ...v]);
  const p = spawn(c, x, { stdio: ['pipe', 'pipe', 'pipe'] }); let o = '', e = ''; p.stdout.on('data', d => { o += d; }); p.stderr.on('data', d => { e += d; });
  p.on('close', code => { const l = o.trim().split('\n').filter(Boolean).pop(); try { fin(JSON.parse(l)); } catch (er) { fin({ _erreur: e || o, code }); } }); p.stdin.end(q.texte); });

const lot = (id, n = 3, extra = {}) => ({ orvane: '1.0', monde: 'orvane', instantane: 1, ...(id ? { id } : {}), source: { jeu: 'x', compte: 'c' }, periode: { debut: '2026-11-19T01:00:00Z', fin: '2026-11-19T02:00:00Z' },
  evenements: [{ taxon: 'jagra', biome: 'toundra', action: 'prelevement', n }], ...extra });
const compter = (where, vars) => +sqlOk(`select count(*) from public.orvane_lots where ${where};`, vars);

(async () => {
  console.log(`Postgres jetable (${BIN}), dans ${tmp}\n`);
  // ce que Supabase a déjà : les rôles de l'API, le schéma des extensions, les droits ouverts par défaut sur le schéma public
  sqlOk(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema extensions; grant usage on schema public, extensions to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
    alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;`);
  const fichier = fs.readFileSync(path.join(racine, 'hebergement/supabase.sql'), 'utf8');
  let avant = null; try { avant = execFileSync('git', ['show', `${base}:hebergement/supabase.sql`], { cwd: racine, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch (e) { /* pas de git */ }

  console.log('1. La migration, sur une base qui sert déjà');
  let A = null;
  if (avant) {
    const q = sql(avant); verif(q.ok, `le fichier de ${base} s'applique${q.ok ? '' : ' : ' + q.erreur}`);
    A = rpc('orvane_inscrire_jeu', { p_nom: 'Jeu branché' });
    const d = rpc('orvane_deposer', { p_cle: A.cle, p_compte: 'joueur-1', p_lot: lot(null) });
    verif(A.ok && d.ok, `avant : un jeu inscrit (${A.jeu}), un lot déposé, à l'ancienne`);
  }
  for (const k of [1, 2]) { const q = sql(fichier); verif(q.ok, `hebergement/supabase.sql s'applique${k === 2 ? ' une seconde fois (il peut être recollé)' : avant ? ' par-dessus' : ''}${q.ok ? '' : ' : ' + q.erreur.split('\n').slice(0, 3).join(' | ')}`); if (!q.ok) process.exit(1); }
  if (!A) { A = rpc('orvane_inscrire_jeu', { p_nom: 'Jeu branché' }); rpc('orvane_deposer', { p_cle: A.cle, p_compte: 'joueur-1', p_lot: lot(null) }); }
  const surcharges = sqlOk(`select string_agg(pg_get_function_identity_arguments(oid), ' | ') from pg_proc where proname = 'orvane_deposer';`);
  verif(surcharges === 'p_cle text, p_compte text, p_lot jsonb, p_cle_depot text', `une seule orvane_deposer, sans surcharge entre lesquelles l'API aurait à choisir (${surcharges})`);
  const v1 = rpc('orvane_deposer', { p_cle: A.cle, p_compte: 'joueur-1', p_lot: lot(null) });
  const v2 = sql(`set role anon; select public.orvane_deposer(:'cle', 'joueur-1', :'lot'::jsonb);`, { cle: A.cle, lot: lot(null) });
  verif(v1.ok === true && !('deja' in v1) && v2.ok && JSON.parse(v2.sortie).ok, 'l\'appel d\'avant (p_cle, p_compte, p_lot), nommé ou dans l\'ordre, est servi comme avant : { ok: true }');
  verif(compter(`jeu = :'j'`, { j: A.jeu }) === 3 && compter(`jeu = :'j' and lot_id is null`, { j: A.jeu }) === 3, 'les lots d\'avant restent ; ceux sans id n\'en ont pas (lot_id nul)');
  const J0 = rpc('orvane_jeu', { p_cle: A.cle });
  verif(J0.ok && J0.cle_depot_exigee === false && !('depot_empreinte' in J0), `orvane_jeu dit si la clé de dépôt est exigée (${J0.cle_depot_exigee}), rien de plus`);

  console.log('\n2. La clé de dépôt');
  const sansCle = rpc('orvane_exiger_cle_depot', { p_cle_admin: A.cle_admin, p_exiger: true });
  verif(!sansCle.ok && /orvane_cle_depot/.test(sansCle.erreur), `l'exiger avant d'en avoir une : refusé (« ${sansCle.erreur} »)`);
  const faux = rpc('orvane_cle_depot', { p_cle_admin: 'orvadm_faux' });
  verif(!faux.ok && /administration/.test(faux.erreur), 'sans la bonne clé d\'administration, pas de clé de dépôt');
  const K = rpc('orvane_cle_depot', { p_cle_admin: A.cle_admin });
  verif(K.ok && /^orvdep_[0-9a-f]{48}$/.test(K.cle_depot) && K.exigee === false, `la clé de dépôt est rendue (orvdep_ et 48 chiffres hexadécimaux), pas encore exigée`);
  const fuite = +sqlOk(`select (select count(*) from public.orvane_jeux j where row_to_json(j)::text like '%' || :'k' || '%') + (select count(*) from public.orvane_lots l where row_to_json(l)::text like '%' || :'k' || '%');`, { k: K.cle_depot });
  const emp = +sqlOk(`select count(*) from public.orvane_jeux where depot_empreinte = extensions.digest(:'k', 'sha256');`, { k: K.cle_depot });
  verif(fuite === 0 && emp === 1, 'Orvane n\'en garde que l\'empreinte (sha256) : la clé n\'est écrite nulle part');
  const nonExigee = rpc('orvane_deposer', { p_cle: A.cle, p_compte: 'joueur-1', p_lot: lot(null) }), fausseDonnee = rpc('orvane_deposer', { p_cle: A.cle, p_compte: 'joueur-1', p_lot: lot(null), p_cle_depot: 'orvdep_faux' });
  verif(nonExigee.ok && !fausseDonnee.ok && /invalide/.test(fausseDonnee.erreur), 'pas encore exigée : un dépôt sans elle passe ; une fausse clé est refusée quand même');
  const ex = rpc('orvane_exiger_cle_depot', { p_cle_admin: A.cle_admin, p_exiger: true });
  const n0 = compter(`jeu = :'j'`, { j: A.jeu });
  const sans = rpc('orvane_deposer', { p_cle: A.cle, p_compte: 'joueur-1', p_lot: lot('lot-sans-cle') }), mauvaise = rpc('orvane_deposer', { p_cle: A.cle, p_compte: 'joueur-1', p_lot: lot('lot-mauvaise'), p_cle_depot: K.cle_depot.slice(0, -1) + (K.cle_depot.endsWith('0') ? '1' : '0') });
  const vide = rpc('orvane_deposer', { p_cle: A.cle, p_compte: 'joueur-1', p_lot: lot('lot-vide'), p_cle_depot: '' });
  verif(ex.ok && ex.exigee && !sans.ok && /clé de dépôt manquante/.test(sans.erreur) && !mauvaise.ok && /invalide/.test(mauvaise.erreur) && !vide.ok && compter(`jeu = :'j'`, { j: A.jeu }) === n0,
    `exigée : sans elle (« ${sans.erreur} »), avec une clé qui diffère d'un caractère ou vide (« ${mauvaise.erreur} ») : refusé, rien n'entre`);
  const bonne = rpc('orvane_deposer', { p_cle: A.cle, p_compte: 'joueur-1', p_lot: lot('lot-bon'), p_cle_depot: K.cle_depot });
  verif(bonne.ok && compter(`jeu = :'j'`, { j: A.jeu }) === n0 + 1 && rpc('orvane_jeu', { p_cle: A.cle }).cle_depot_exigee === true, 'avec la bonne clé : accepté ; orvane_jeu le dit (cle_depot_exigee)');
  const K2 = rpc('orvane_cle_depot', { p_cle_admin: A.cle_admin }), ancienne = rpc('orvane_deposer', { p_cle: A.cle, p_compte: 'joueur-1', p_lot: lot('lot-ancienne'), p_cle_depot: K.cle_depot });
  const neuve = rpc('orvane_deposer', { p_cle: A.cle, p_compte: 'joueur-1', p_lot: lot('lot-neuve'), p_cle_depot: K2.cle_depot });
  verif(K2.ok && K2.cle_depot !== K.cle_depot && K2.exigee === true && !ancienne.ok && neuve.ok, 'renouvelée : l\'ancienne ne vaut plus rien aussitôt, la nouvelle passe, l\'exigence reste');
  const nom = rpc('orvane_nommer', { p_cle: A.cle, p_compte: 'joueur-1', p_monde: 'orvane', p_taxon: 'jagra', p_nom: 'Jagra des neiges' });
  verif(nom.ok, 'orvane_nommer (les noms que proposent les joueurs, depuis le client) n\'est pas touché');
  const B = rpc('orvane_inscrire_jeu', { p_nom: 'Autre jeu' }), autre = rpc('orvane_deposer', { p_cle: B.cle, p_compte: 'joueur-1', p_lot: lot(null) });
  verif(B.ok && autre.ok, 'un autre jeu, qui n\'exige rien, dépose comme avant');
  const libre = rpc('orvane_exiger_cle_depot', { p_cle_admin: A.cle_admin, p_exiger: false }), apresLibre = rpc('orvane_deposer', { p_cle: A.cle, p_compte: 'joueur-1', p_lot: lot(null) });
  verif(libre.ok && libre.exigee === false && apresLibre.ok, 'ne plus l\'exiger : un dépôt sans elle repasse');
  rpc('orvane_exiger_cle_depot', { p_cle_admin: A.cle_admin, p_exiger: true });

  console.log('\n3. Les renvois');
  const avec = c => ({ p_cle: A.cle, p_compte: c, p_cle_depot: K2.cle_depot });
  const p1 = rpc('orvane_deposer', { ...avec('joueur-2'), p_lot: lot('a1b2c3d4e5f60718') }), n1 = compter(`jeu = :'j'`, { j: A.jeu });
  const p2 = rpc('orvane_deposer', { ...avec('joueur-2'), p_lot: lot('a1b2c3d4e5f60718') });
  verif(p1.ok && !p1.deja && p2.ok && p2.deja === true && compter(`jeu = :'j'`, { j: A.jeu }) === n1, `un lot renvoyé avec le même id : { ok: true, deja: true }, et il n'entre pas deux fois`);
  const autreLot = rpc('orvane_deposer', { ...avec('joueur-2'), p_lot: lot('a1b2c3d4e5f60718', 7) }), autreCompte = rpc('orvane_deposer', { ...avec('joueur-3'), p_lot: lot('a1b2c3d4e5f60718') });
  verif(!autreLot.ok && /déjà pris/.test(autreLot.erreur) && autreCompte.ok && autreCompte.deja === true && compter(`jeu = :'j'`, { j: A.jeu }) === n1,
    `le même id sur un autre lot : refusé (« ${autreLot.erreur} »), plutôt qu'avalé en silence ; le même lot renvoyé par un autre compte : deja, rien n'est écrit (un kit qui a changé de compte ne reste pas bloqué)`);
  const ailleurs = rpc('orvane_deposer', { p_cle: B.cle, p_compte: 'joueur-2', p_lot: lot('a1b2c3d4e5f60718') });
  verif(ailleurs.ok && !ailleurs.deja, 'le même id venu d\'un autre jeu : un autre lot, accepté (l\'id est propre à chaque jeu)');
  const mauvaisId = ['', 'x'.repeat(65), '-commence', 'avec espace', 'é1', 'a/b', "a'b"].map(id => rpc('orvane_deposer', { ...avec('joueur-2'), p_lot: { ...lot(null), id } }));
  const nonChaine = rpc('orvane_deposer', { ...avec('joueur-2'), p_lot: { ...lot(null), id: 12 } }), long = rpc('orvane_deposer', { ...avec('joueur-2'), p_lot: lot('x'.repeat(64)) });
  verif(mauvaisId.every(x => !x.ok && /id du lot/.test(x.erreur)) && !nonChaine.ok && long.ok, 'un id vide, de 65 caractères, qui commence par un tiret, avec une espace, un accent, une barre, une apostrophe, ou un nombre : refusé ; 64 caractères : accepté');
  // le quota du jeu : un renvoi passe quand même, et ne compte pas
  const C = rpc('orvane_inscrire_jeu', { p_nom: 'Petit jeu' }); sqlOk(`update public.orvane_jeux set quota_jour = 2 where id = :'j';`, { j: C.jeu });
  const q1 = rpc('orvane_deposer', { p_cle: C.cle, p_compte: 'j1', p_lot: lot('q-1') }), q2 = rpc('orvane_deposer', { p_cle: C.cle, p_compte: 'j2', p_lot: lot('q-2') });
  const q1b = rpc('orvane_deposer', { p_cle: C.cle, p_compte: 'j1', p_lot: lot('q-1') }), q3 = rpc('orvane_deposer', { p_cle: C.cle, p_compte: 'j3', p_lot: lot('q-3') });
  verif(q1.ok && q2.ok && q1b.ok && q1b.deja && !q3.ok && /quota du jeu/.test(q3.erreur) && compter(`jeu = :'j'`, { j: C.jeu }) === 2,
    `quota du jeu atteint (2 lots) : un renvoi répond encore { ok: true, deja: true } ; un lot nouveau est refusé (« ${q3.erreur} »)`);
  // les 48 lots d'un joueur : un renvoi ne les entame pas
  sqlOk(`update public.orvane_jeux set quota_jour = 1000 where id = :'j';`, { j: C.jeu });
  let tous = true; for (let k = 1; k <= 47; k++) tous = rpc('orvane_deposer', { p_cle: C.cle, p_compte: 'j9', p_lot: lot('j9-' + k) }).ok && tous;
  const r48 = Array.from({ length: 5 }, () => rpc('orvane_deposer', { p_cle: C.cle, p_compte: 'j9', p_lot: lot('j9-1') }));
  const d48 = rpc('orvane_deposer', { p_cle: C.cle, p_compte: 'j9', p_lot: lot('j9-48') }), d49 = rpc('orvane_deposer', { p_cle: C.cle, p_compte: 'j9', p_lot: lot('j9-49') });
  verif(tous && r48.every(x => x.ok && x.deja) && d48.ok && !d48.deja && !d49.ok && /trop de dépôts/.test(d49.erreur),
    'un joueur à 47 lots renvoie cinq fois le premier : rien n\'est entamé, son 48ᵉ passe, le 49ᵉ est refusé');
  // deux dépôts du même id en même temps : le premier tient son verrou une seconde et demie, le second attend, puis voit le premier
  const lent = rpcAsync('orvane_deposer', { ...avec('joueur-4'), p_lot: lot('en-meme-temps') }, { avant: 'begin; ', apres: ' select pg_sleep(1.5); commit;' });
  await new Promise(r => setTimeout(r, 400));
  const t0 = Date.now(), vite = await rpcAsync('orvane_deposer', { ...avec('joueur-4'), p_lot: lot('en-meme-temps') }), attendu = Date.now() - t0, premier = await lent;
  verif(premier.ok && !premier.deja && vite.ok && vite.deja === true && attendu > 600 && compter(`jeu = :'j' and lot_id = 'en-meme-temps'`, { j: A.jeu }) === 1,
    `deux dépôts du même id en même temps : le second attend la fin du premier (${attendu} ms), puis répond deja ; une seule ligne`);
  const dix = await Promise.all(Array.from({ length: 10 }, () => rpcAsync('orvane_deposer', { ...avec('joueur-5'), p_lot: lot('dix-fois') })));
  verif(dix.filter(x => x.ok && !x.deja).length === 1 && dix.filter(x => x.ok && x.deja).length === 9 && compter(`jeu = :'j' and lot_id = 'dix-fois'`, { j: A.jeu }) === 1, 'le même lot envoyé dix fois à la fois : un accepté, neuf deja, une seule ligne');
  const ix = sql(`insert into public.orvane_lots (jeu, compte, monde, lot, lot_id) values (:'j', 'x', 'orvane', '{}', 'dix-fois');`, { j: A.jeu });
  verif(!ix.ok && /orvane_lots_jeu_lot_id/.test(ix.erreur), 'et l\'index unique (jeu, lot_id) tient la règle même sans la fonction');
  sqlOk(`insert into orvane_prive.cles (nom, empreinte) values ('lecture', extensions.digest('secret-essai', 'sha256')) on conflict (nom) do update set empreinte = excluded.empreinte;
    update public.orvane_lots set recu = recu - interval '5 minutes';`);
  const lus = sqlOk(`set role anon; select coalesce(json_agg(lot->>'id'), '[]') from public.orvane_lire_lots('secret-essai', 'orvane', 0, 1000) where lot ? 'id';`);
  verif(JSON.parse(lus).includes('a1b2c3d4e5f60718') && JSON.parse(lus).filter(x => x === 'dix-fois').length === 1, 'la lecture de la nuit rend l\'id de chaque lot (le tampon écarte aussi un doublon, par défense)');

  console.log('\n3 bis. Les recollages (une seconde base)');
  if (avant) {
    const B2 = 'recollages', prea = `create schema extensions; grant usage on schema public, extensions to anon, authenticated, service_role;
      alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
      alter default privileges in schema public grant all on functions to anon, authenticated, service_role;`;
    sqlOk(`create database ${B2};`); sqlOk(prea, {}, B2); sqlOk(avant, {}, B2);
    const G = rpc('orvane_inscrire_jeu', { p_nom: 'Jeu des recollages' }, { base: B2 }), dep = (l, extra = {}) => rpc('orvane_deposer', { p_cle: G.cle, p_compte: 'j', p_lot: l, ...extra }, { base: B2 });
    dep(lot(null)); const sig = () => sql(`select string_agg(pg_get_function_identity_arguments(oid), ' | ') from pg_proc where proname = 'orvane_deposer';`, {}, B2).sortie;
    // un recollage interrompu (une erreur juste après le retrait de l'ancienne fonction) : rien ne bouge, l'ancienne sert toujours
    const casse = fichier.replace('drop function if exists public.orvane_deposer(text, text, jsonb);', m => m + '\nselect 1 / 0;');
    const q1 = sql(casse, {}, B2), apres1 = dep(lot(null));
    verif(casse !== fichier && !q1.ok && /division by zero/.test(q1.erreur) && sig() === 'p_cle text, p_compte text, p_lot jsonb' && apres1.ok && sql("select count(*) from information_schema.columns where table_name = 'orvane_lots' and column_name = 'lot_id';", {}, B2).sortie === '0',
      `un recollage interrompu au milieu (juste après le retrait de l'ancienne orvane_deposer) ne laisse rien à moitié : le fichier passe d'un bloc, l'ancienne fonction sert toujours, aucune colonne n'est ajoutée`);
    const q2 = sql(fichier, {}, B2), q3 = sql(fichier, {}, B2), apres2 = dep(lot('recolle-1'));
    verif(q2.ok && q3.ok && sig() === 'p_cle text, p_compte text, p_lot jsonb, p_cle_depot text' && apres2.ok && +sql(`select count(*) from public.orvane_lots;`, {}, B2).sortie === 3, 'puis collé deux fois sur cette base qui sert : une seule orvane_deposer, les lots d\'avant restent');
    // une version plus ancienne recollée par-dessus : une seconde orvane_deposer, et plus aucun dépôt ne passe
    const q4 = sql(avant, {}, B2), panne = dep(lot(null)), panneSql = sql(`set role anon; select public.orvane_deposer(:'c', 'j', :'l'::jsonb);`, { c: G.cle, l: lot(null) }, B2);
    verif(q4.ok && sig().split(' | ').length === 2 && (!panneSql.ok && /not unique/.test(panneSql.erreur)) && panne._erreur, `recoller une version plus ancienne ajoute une seconde orvane_deposer, et plus aucun dépôt ne passe (« ${(panneSql.erreur.match(/function [^\n]*not unique/) || [''])[0]} ») : hebergement/LISEZ-MOI.md l'interdit`);
    // le retour en arrière, tel que hebergement/LISEZ-MOI.md le dit : retirer la fonction nouvelle, puis recoller l'ancien fichier
    const q5 = sql('drop function public.orvane_deposer(text, text, jsonb, text);', {}, B2), q6 = sql(avant, {}, B2), retour = dep(lot(null));
    verif(q5.ok && q6.ok && sig() === 'p_cle text, p_compte text, p_lot jsonb' && retour.ok, 'le retour en arrière décrit (retirer orvane_deposer à quatre paramètres, puis recoller l\'ancien) : une seule fonction, les dépôts repassent');
    const q7 = sql(fichier, {}, B2), deNouveau = dep(lot('recolle-1'));
    verif(q7.ok && sig() === 'p_cle text, p_compte text, p_lot jsonb, p_cle_depot text' && deNouveau.ok && deNouveau.deja === true, 'et la version d\'ici, recollée ensuite, reprend tout (les id d\'avant le retour sont reconnus)');
  } else console.log('  (pas de version de référence : les recollages ne sont pas essayés)');

  console.log('\n4. Les droits');
  const tables = ['public.orvane_jeux', 'public.orvane_lots', 'public.orvane_noms', 'orvane_prive.cles'].map(t => sql(`set role anon; select count(*) from ${t};`));
  const prive = sql(`set role anon; select orvane_prive.egales('\\x01'::bytea, '\\x01'::bytea);`), auth = sql(`set role authenticated; select depot_empreinte from public.orvane_jeux limit 1;`);
  verif(tables.every(x => !x.ok && /permission denied/.test(x.erreur)) && !prive.ok && /permission denied/.test(prive.erreur) && !auth.ok, 'anon et authenticated n\'ouvrent aucune table, ni le schéma privé (l\'empreinte ne se lit pas)');
  const defs = sqlOk(`select coalesce(string_agg(proname, ', '), '') from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and proname like 'orvane\\_%' and (not prosecdef or proconfig is null or not exists (select 1 from unnest(proconfig) c where c like 'search\\_path=%'));`);
  const ouvertes = sqlOk(`select string_agg(proname, ', ' order by proname) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and proname like 'orvane\\_%' and has_function_privilege('anon', p.oid, 'execute');`);
  verif(defs === '' && /orvane_cle_depot/.test(ouvertes) && /orvane_exiger_cle_depot/.test(ouvertes) && /orvane_deposer/.test(ouvertes), `chaque fonction publique est security definer, son chemin fixé ; anon peut appeler : ${ouvertes}`);
  verif(sql(`select orvane_prive.egales(extensions.digest('a', 'sha256'), extensions.digest('a', 'sha256')) and not orvane_prive.egales(extensions.digest('a', 'sha256'), extensions.digest('b', 'sha256')) and not orvane_prive.egales(null, '\\x01') and not orvane_prive.egales('\\x01', '\\x0102');`).sortie === 't',
    'la comparaison des empreintes : égales, différentes, nulle, de longueurs différentes');
  const encore = sql(fichier), apresEncore = rpc('orvane_deposer', { ...avec('joueur-2'), p_lot: lot('a1b2c3d4e5f60718') }), toujours = rpc('orvane_jeu', { p_cle: A.cle });
  verif(encore.ok && apresEncore.deja && toujours.cle_depot_exigee === true, 'recollé une troisième fois, sur une base pleine : les lots, les id, la clé de dépôt et son exigence restent');

  console.log('\n5. Le client des serveurs (kits/serveur/depot.mjs)');
  // une petite API locale, comme PostgREST : POST /rest/v1/rpc/<fonction>, le rôle anon. « sabot » abîme les réponses à la demande
  let sabot = null, appels = 0;
  const serveur = http.createServer((q, s) => { let corps = ''; q.on('data', d => { corps += d; }); q.on('end', async () => { appels++;
    const fn = (/^\/rest\/v1\/rpc\/([a-z_]+)$/.exec(q.url) || [])[1], ko = sabot ? sabot() : null;
    if (ko === 503) { s.writeHead(503); return s.end('indisponible'); }
    if (q.headers.apikey !== 'cle-publique') { s.writeHead(401); return s.end('{"message":"apikey"}'); }
    let x = {}; try { x = JSON.parse(corps); } catch (e) { s.writeHead(400); return s.end('{}'); }
    const rep = await rpcAsync(fn, x);
    if (ko === 'perdue') return q.socket.destroy();                          // le dépôt est fait, la réponse se perd
    if (typeof ko === 'number' && ko > 1000) await new Promise(r => setTimeout(r, ko));   // le dépôt est fait, la réponse tarde
    s.writeHead(200, { 'Content-Type': 'application/json' }); s.end(JSON.stringify(rep)); }); });
  await new Promise(r => serveur.listen(0, '127.0.0.1', r));
  const url = `http://127.0.0.1:${serveur.address().port}`, O = { cle: A.cle, cleDepot: K2.cle_depot, url, apikey: 'cle-publique', attente: 20 };
  const { deposer, nouvelId, ORVANE } = await import(path.join(racine, 'kits/serveur/depot.mjs'));
  const Cjs = require(path.join(racine, 'kits/serveur/depot.cjs'));
  const l1 = lot(null), d1 = await deposer(O, 'serveur-1', l1);
  verif(d1.ok && !d1.deja && /^[0-9a-f]{32}$/.test(l1.id) && d1.id === l1.id && compter(`lot_id = :'i'`, { i: l1.id }) === 1, `un lot sans id : le client lui en donne un (${l1.id}), l'écrit dans le lot, et le dépose`);
  const d1b = await deposer(O, 'serveur-1', l1);
  verif(d1b.ok && d1b.deja === true, 'le même lot renvoyé plus tard : { ok: true, deja: true }');
  let n = 0; sabot = () => (++n === 1 ? 'perdue' : null); appels = 0;
  const l2 = lot(null), d2 = await deposer(O, 'serveur-1', l2);
  verif(d2.ok && d2.deja === true && d2.essais === 2 && compter(`lot_id = :'i'`, { i: l2.id }) === 1, `la réponse se perd (le dépôt est fait) : le client renvoie le même id, Orvane répond deja ; le lot n'est compté qu'une fois (${d2.essais} essais)`);
  n = 0; sabot = () => (++n <= 2 ? 503 : null);
  const l3 = lot(null), d3 = await deposer(O, 'serveur-1', l3);
  verif(d3.ok && !d3.deja && d3.essais === 3, 'le serveur flanche deux fois (503) : le troisième essai passe');
  n = 0; sabot = () => (++n === 1 ? 1500 : null);
  const l4 = lot(null), d4 = await deposer({ ...O, delai: 400 }, 'serveur-1', l4); await new Promise(r => setTimeout(r, 1300));
  verif(d4.ok && d4.deja === true && compter(`lot_id = :'i'`, { i: l4.id }) === 1, 'la réponse tarde au-delà du délai : renvoyé, deja, une seule ligne');
  sabot = () => 503; const l5 = lot(null), d5 = await deposer({ ...O, essais: 3 }, 'serveur-1', l5);
  verif(!d5.ok && d5.plusTard === true && d5.essais === 3 && d5.id === l5.id, `toujours en panne : refusé après 3 essais, plusTard (« ${d5.erreur} ») ; le lot garde son id pour la prochaine fois`);
  sabot = null; const d5b = await deposer(O, 'serveur-1', l5);
  verif(d5b.ok && !d5b.deja, 'plus tard, le même lot passe');
  appels = 0; const d6 = await deposer({ ...O, cleDepot: 'orvdep_faux' }, 'serveur-1', lot(null)), d7 = await deposer({ ...O, cleDepot: undefined }, 'serveur-1', lot(null));
  verif(!d6.ok && d6.plusTard && d6.config && d6.essais === 1 && !d7.ok && /manquante/.test(d7.erreur) && d7.plusTard && d7.config && appels === 2,
    'une clé de dépôt fausse, ou absente quand le jeu l\'exige : pas de renvoi tout de suite, mais plusTard et config (une configuration à réparer : le lot se garde)');
  // la clé renouvelée : le serveur a encore l'ancienne ; il garde ses lots, puis les renvoie tels quels avec la nouvelle
  const K3 = rpc('orvane_cle_depot', { p_cle_admin: A.cle_admin }), lr = lot(null), dr1 = await deposer(O, 'serveur-1', lr), dr2 = await deposer({ ...O, cleDepot: K3.cle_depot }, 'serveur-1', lr);
  O.cleDepot = K3.cle_depot;
  verif(K3.ok && !dr1.ok && /invalide/.test(dr1.erreur) && dr1.plusTard && dr1.config && dr2.ok && !dr2.deja && dr2.id === dr1.id && compter(`lot_id = :'i'`, { i: lr.id }) === 1,
    'la clé renouvelée, le serveur a encore l\'ancienne : le lot est gardé (plusTard, config), puis passe tel quel, avec son id, une fois la nouvelle en place');
  const d8 = await deposer({ ...O, apikey: 'mauvaise' }, 'serveur-1', lot(null)), d9 = await deposer(O, 'serveur-1', { ...lot(null), id: 'pas bon' }), d10 = await deposer(O, '', lot(null));
  verif(!d8.ok && /HTTP 401/.test(d8.erreur) && d8.plusTard && d8.config && !d9.ok && /id du lot/.test(d9.erreur) && !d9.plusTard && !d10.ok && d10.config,
    'une clé publique refusée (401) : config, le lot se garde ; un id mal formé : le lot lui-même est refusé (plusTard : false) ; un compte vide : refusé avant le réseau');
  let leve = null, gele = null, geleId = null; try { gele = await deposer(O, 'serveur-1', Object.freeze(lot(null))); geleId = await deposer(O, 'serveur-1', Object.freeze(lot(await nouvelId()))); } catch (e) { leve = e; }
  verif(!leve && gele && !gele.ok && /gelé/.test(gele.erreur) && !gele.plusTard && geleId?.ok, `un lot gelé (Object.freeze) sans id : { ok: false } sans lever (« ${gele?.erreur} ») ; gelé avec son id : déposé`);
  appels = 0; const d11 = await deposer({ ...O, url: 'http://exemple.invalid' }, 'serveur-1', lot(null)), d12 = await deposer({ ...O, essais: NaN, attente: -1, delai: 'x' }, 'serveur-1', lot(null));
  verif(!d11.ok && /https/.test(d11.erreur) && d11.config && appels === 1 && d12.ok, 'la clé de dépôt ne part jamais en clair vers une autre machine (https seulement) ; des options absurdes reprennent leurs valeurs par défaut');
  const lc = lot(null), dc = await Cjs.deposer(O, 'serveur-2', lc), dcb = await Cjs.depot(O).deposer('serveur-2', lc);
  verif(dc.ok && dcb.deja && JSON.stringify(Cjs.ORVANE) === JSON.stringify(ORVANE) && /^[0-9a-f]{32}$/.test(await Cjs.nouvelId()) && (await nouvelId()) !== (await nouvelId()), 'en CommonJS (require, depot.cjs) : la même chose, les mêmes adresses');
  // sous Deno : le même module, tel qu'une fonction Supabase l'importe
  const deno = arg('--deno', null) || process.env.DENO || (() => { try { return execFileSync('which', ['deno'], { encoding: 'utf8' }).trim(); } catch (e) { return null; } })();
  if (deno && fs.existsSync(deno)) {
    const script = path.join(tmp, 'essai-deno.ts');
    fs.writeFileSync(script, `import { deposer } from ${JSON.stringify('file://' + path.join(racine, 'kits/serveur/depot.mjs'))};
const O = { cle: ${JSON.stringify(A.cle)}, cleDepot: ${JSON.stringify(O.cleDepot)}, url: ${JSON.stringify(url)}, apikey: 'cle-publique', attente: 20 };
const lot = ${JSON.stringify(lot(null))};
const a = await deposer(O, 'deno-1', lot), b = await deposer(O, 'deno-1', lot);
console.log(JSON.stringify({ a, b, id: lot.id }));\n`);
    n = 0; sabot = () => (++n === 1 ? 'perdue' : null);
    // (lancé sans bloquer : l'API locale tourne dans ce processus, elle doit pouvoir répondre)
    const p = await new Promise(fin => { const x = spawn(deno, ['run', '--quiet', '--no-prompt', `--allow-net=127.0.0.1:${serveur.address().port}`, script], { env: { ...process.env, DENO_DIR: path.join(tmp, 'deno'), NO_COLOR: '1' } });
      let stdout = '', stderr = ''; x.stdout.on('data', d => { stdout += d; }); x.stderr.on('data', d => { stderr += d; }); x.on('close', () => fin({ stdout, stderr })); });
    let D = null; try { D = JSON.parse(p.stdout.trim().split('\n').pop()); } catch (e) { /* rien */ }
    const v = spawnSync(deno, ['--version'], { encoding: 'utf8' }).stdout.split('\n')[0];
    verif(D && D.a.ok && D.a.deja === true && D.a.essais === 2 && D.b.deja === true && compter(`lot_id = :'i'`, { i: D.id }) === 1,
      `sous Deno (${v}), sans autre droit que le réseau vers l'API : le même client, la réponse perdue, le renvoi deja${D?.a?.ok && D.b?.deja ? '' : ' — ' + (D ? JSON.stringify(D) : (p.stderr || p.stdout).slice(0, 300))}`);
  } else console.log('  (pas de Deno ici : --deno <chemin> pour l\'essayer aussi)');
  serveur.close();
  console.log(ok ? '\ntout passe' : '\nÉCHEC');
  process.exitCode = ok ? 0 : 1;
})().catch(e => { console.error('essai interrompu :', e); process.exitCode = 1; });
