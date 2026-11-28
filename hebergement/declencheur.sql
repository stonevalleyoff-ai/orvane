-- Orvane — LE DÉCLENCHEUR DU CYCLE (hebergement/declencheur.sql) — docs/19
-- GitHub ne garantit pas l'heure de ses actions programmées : la passe de 03:17 UTC partait parfois à 10 h 50, ou pas du tout pendant
-- sept heures. Ici, le Supabase d'Orvane lance lui-même l'action « cycle » à heure fixe (pg_cron), par l'API de GitHub (pg_net,
-- l'appel workflow_dispatch). L'action garde son propre horaire, en renfort : un cycle dû n'est jamais fait deux fois.
--
-- À faire une fois :
--  1. Sur GitHub : Settings (du compte) › Developer settings › Personal access tokens › Fine-grained tokens › Generate new token.
--     Repository access : « Only select repositories », le dépôt orvane. Permissions › Repository permissions › Actions :
--     « Read and write ». Rien d'autre. Une date d'expiration (un an au plus) : il faudra le renouveler (étape 3).
--  2. Coller ce fichier dans l'éditeur SQL du projet Supabase d'Orvane (il peut être recollé : tout est « if not exists » /
--     « or replace »). pg_cron et pg_net s'activent aussi dans Database › Extensions.
--  3. Ranger le jeton dans le coffre du projet (jamais dans un fichier, ni dans le dépôt) : dans l'éditeur SQL,
--        select vault.create_secret('<le jeton>', 'orvane_github_jeton');
--     et pour le changer plus tard :
--        select vault.update_secret((select id from vault.secrets where name = 'orvane_github_jeton'), '<le jeton neuf>');
--  4. Vérifier : select orvane_prive.lancer_cycle();   puis, une minute après :
--        select status_code, content from net._http_response order by created desc limit 3;
--     204 : GitHub a lancé l'action (l'onglet Actions la montre, « workflow_dispatch »). 401 : le jeton est faux ou périmé ;
--     403 ou 404 : il n'a pas la permission Actions sur le dépôt.
-- Chaque heure, à la 5ᵉ minute : l'action regarde chaque monde et ne fait tourner que celui dont l'heure est venue (le monde
-- d'Orvane, une fois par jour, à 03:00 UTC) ; les autres passes ne publient rien de neuf. Le dépôt est public : ses actions ne coûtent rien.
create extension if not exists pg_cron;
create extension if not exists pg_net;

create schema if not exists orvane_prive;
revoke all on schema orvane_prive from public, anon, authenticated;

-- lancer l'action « cycle » de la branche main (le jeton : dans le coffre, sous le nom orvane_github_jeton)
create or replace function orvane_prive.lancer_cycle() returns bigint
language plpgsql security definer set search_path = orvane_prive, extensions as $$
declare jeton text;
begin
  select decrypted_secret into jeton from vault.decrypted_secrets where name = 'orvane_github_jeton' limit 1;
  if jeton is null then raise exception 'pas de jeton : select vault.create_secret(''<le jeton>'', ''orvane_github_jeton'');'; end if;
  return net.http_post(
    url := 'https://api.github.com/repos/stonevalleyoff-ai/orvane/actions/workflows/cycle.yml/dispatches',
    headers := jsonb_build_object('Authorization', 'Bearer ' || jeton, 'Accept', 'application/vnd.github+json',
                                  'X-GitHub-Api-Version', '2022-11-28', 'User-Agent', 'orvane-declencheur', 'Content-Type', 'application/json'),
    body := '{"ref": "main"}'::jsonb);
end $$;
revoke all on function orvane_prive.lancer_cycle() from public, anon, authenticated;

-- chaque heure, à la 5ᵉ minute (cron.schedule remplace une tâche du même nom : le fichier peut être recollé)
select cron.schedule('orvane-cycle', '5 * * * *', 'select orvane_prive.lancer_cycle()');
-- pour l'arrêter : select cron.unschedule('orvane-cycle');
