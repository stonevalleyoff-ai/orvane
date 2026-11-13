-- Orvane — LE SUPABASE D'ORVANE (hebergement/supabase.sql)
-- Le projet Supabase propre à Orvane : n'importe quel jeu s'y inscrit, reçoit une clé, et y dépose ce que font ses
-- joueurs ; l'action nocturne d'Orvane le lit avec son secret. Aucune table n'est accessible directement : tout passe
-- par les fonctions ci-dessous (hebergement/LISEZ-MOI.md).
--   orvane_inscrire_jeu(nom, contact)        n'importe qui      → { jeu, cle, cle_admin } : la clé publique du jeu, sa clé d'administration
--   orvane_regler_jeu(cle_admin, exposition) le jeu            → ce que le jeu sait montrer (le tampon en a besoin pour dénormaliser)
--   orvane_deposer(cle, compte, lot)         le client du jeu  → un lot de pressions (compte : l'identifiant du joueur dans le jeu)
--   orvane_jeu(cle)                          le client du jeu  → ce qu'Orvane sait du jeu
--   orvane_lire_lots(secret, monde, après)   l'action nocturne → les lots, comptes pseudonymisés
--   orvane_lire_jeux(secret)                 l'action nocturne → les jeux et leur exposition
--   orvane_nommer(cle, compte, monde, taxon, nom, auteur)   le client du jeu → un joueur propose le nom commun d'une lignée (docs/37)
--   orvane_lire_noms(secret, monde, après)   l'action nocturne → les noms proposés, dans l'ordre d'arrivée
-- À coller une fois dans l'éditeur SQL du projet (il peut être recollé : tout est « if not exists » / « or replace »).
create extension if not exists pgcrypto with schema extensions;

-- === les jeux ===
create table if not exists public.orvane_jeux (
  id              text primary key,                        -- « stone-valley »
  nom             text not null,
  contact         text,
  cle             text not null unique,                    -- publique : elle est dans le code du jeu
  admin_empreinte bytea not null,                          -- l'empreinte de la clé d'administration (la clé, jamais)
  exposition      jsonb not null default '{}'::jsonb,      -- profil.exposition du jeu (schemas/profil.schema.json)
  actif           boolean not null default true,
  quota_jour      int not null default 20000,              -- lots par jour, tous joueurs confondus
  cree            timestamptz not null default now()
);
-- === les lots ===
create table if not exists public.orvane_lots (
  id     bigserial primary key,
  jeu    text not null references public.orvane_jeux (id),
  compte text not null,                                    -- pseudonyme : empreinte du compte du joueur dans son jeu
  monde  text not null,
  lot    jsonb not null,
  recu   timestamptz not null default now()
);
create index if not exists orvane_lots_monde_id on public.orvane_lots (monde, id);                 -- la lecture nocturne
create index if not exists orvane_lots_jeu_compte_recu on public.orvane_lots (jeu, compte, recu);  -- les quotas
create index if not exists orvane_lots_jeu_recu on public.orvane_lots (jeu, recu);
alter table public.orvane_jeux enable row level security;
alter table public.orvane_lots enable row level security;
revoke all on public.orvane_jeux, public.orvane_lots from anon, authenticated;
revoke all on sequence public.orvane_lots_id_seq from anon, authenticated;

-- === le secret de lecture de l'action nocturne (seule son empreinte est gardée, dans un schéma que l'API ne sert pas) ===
create schema if not exists orvane_prive;
revoke all on schema orvane_prive from public, anon, authenticated;
create table if not exists orvane_prive.cles (nom text primary key, empreinte bytea not null, cree timestamptz not null default now());
revoke all on orvane_prive.cles from public, anon, authenticated;
create or replace function orvane_prive.secret_ok(p_secret text) returns boolean
language sql stable security definer set search_path = orvane_prive, extensions as $$
  select p_secret is not null and exists (select 1 from orvane_prive.cles c where c.nom = 'lecture' and c.empreinte = extensions.digest(p_secret, 'sha256'))
$$;

-- === s'inscrire : n'importe quel jeu, sans compte. 30 inscriptions par heure au plus, pour tout le monde ===
create or replace function public.orvane_inscrire_jeu(p_nom text, p_contact text default null) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare base text; ident text; cle text; adm text; n int;
begin
  if p_nom is null or length(trim(p_nom)) < 2 or length(p_nom) > 60 then return jsonb_build_object('ok', false, 'erreur', 'nom de jeu : 2 à 60 caractères'); end if;
  select count(*) into n from public.orvane_jeux where cree > now() - interval '1 hour';
  if n >= 30 then return jsonb_build_object('ok', false, 'erreur', 'trop d''inscriptions en ce moment, réessayez dans une heure'); end if;
  base := trim(both '-' from regexp_replace(translate(lower(trim(p_nom)), 'àâäáãåéèêëíìîïóòôöõúùûüýÿçñœæ', 'aaaaaaeeeeiiiiooooouuuuyycnoa'), '[^a-z0-9]+', '-', 'g'));
  if base = '' then base := 'jeu'; end if;
  ident := left(base, 40);
  if exists (select 1 from public.orvane_jeux where id = ident) then ident := left(base, 34) || '-' || encode(extensions.gen_random_bytes(3), 'hex'); end if;
  cle := 'orv_' || encode(extensions.gen_random_bytes(16), 'hex');
  adm := 'orvadm_' || encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.orvane_jeux (id, nom, contact, cle, admin_empreinte) values (ident, trim(p_nom), left(p_contact, 200), cle, extensions.digest(adm, 'sha256'));
  return jsonb_build_object('ok', true, 'jeu', ident, 'cle', cle, 'cle_admin', adm,
    'note', 'la clé va dans le code du jeu ; la clé d''administration se garde secrète (orvane_regler_jeu)');
end $$;

-- === régler son jeu : ce qu'il sait montrer (32 Ko au plus) ; avec la clé d'administration ===
create or replace function public.orvane_regler_jeu(p_cle_admin text, p_exposition jsonb, p_nom text default null) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare ident text;
begin
  select id into ident from public.orvane_jeux where admin_empreinte = extensions.digest(coalesce(p_cle_admin, ''), 'sha256');
  if ident is null then return jsonb_build_object('ok', false, 'erreur', 'clé d''administration inconnue'); end if;
  if p_exposition is not null and (jsonb_typeof(p_exposition) is distinct from 'object' or pg_column_size(p_exposition) > 32768) then return jsonb_build_object('ok', false, 'erreur', 'exposition : un objet de 32 Ko au plus'); end if;
  if p_exposition is not null and (coalesce(jsonb_typeof(p_exposition->'traits_rendus'), 'array') <> 'array' or coalesce(jsonb_typeof(p_exposition->'familles'), 'array') <> 'array'
     or coalesce(jsonb_typeof(p_exposition->'compression'), 'object') <> 'object' or coalesce(jsonb_typeof(p_exposition->'taux_jeu'), 'object') <> 'object'
     or coalesce(jsonb_typeof(p_exposition->'mode'), 'string') <> 'string')
  then return jsonb_build_object('ok', false, 'erreur', 'exposition : traits_rendus et familles sont des listes, compression et taux_jeu des objets, mode un mot'); end if;
  update public.orvane_jeux set exposition = coalesce(p_exposition, exposition), nom = coalesce(nullif(trim(p_nom), ''), nom) where id = ident;
  return jsonb_build_object('ok', true, 'jeu', ident);
end $$;

-- === déposer un lot : 64 Ko, 500 événements, 48 lots par joueur et par jour, le quota du jeu ===
create or replace function public.orvane_deposer(p_cle text, p_compte text, p_lot jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare j public.orvane_jeux; pseudo text; n int;
begin
  select * into j from public.orvane_jeux where cle = p_cle;
  if j.id is null then return jsonb_build_object('ok', false, 'erreur', 'clé de jeu inconnue'); end if;
  if not j.actif then return jsonb_build_object('ok', false, 'erreur', 'ce jeu est suspendu'); end if;
  if p_compte is null or length(p_compte) < 1 or length(p_compte) > 128 then return jsonb_build_object('ok', false, 'erreur', 'compte : 1 à 128 caractères'); end if;
  if jsonb_typeof(p_lot) is distinct from 'object' or jsonb_typeof(p_lot->'evenements') is distinct from 'array' then return jsonb_build_object('ok', false, 'erreur', 'lot mal formé'); end if;
  if pg_column_size(p_lot) > 65536 or jsonb_array_length(p_lot->'evenements') > 500 then return jsonb_build_object('ok', false, 'erreur', 'lot trop gros'); end if;
  -- chaque événement au contrat (schemas/pression.schema.json) : un objet, une action connue, un n entre 0 et 10 000, des noms qui
  -- sont des chaînes ; le cycle de nuit les revérifie, mais un lot qui n'y répond pas n'entre pas
  if exists (select 1 from jsonb_array_elements(p_lot->'evenements') e
     where jsonb_typeof(e) <> 'object'
        or not coalesce(case when jsonb_typeof(e->'n') = 'number' then (e->>'n')::numeric between 0 and 10000 end, false)
        or jsonb_typeof(e->'biome') is distinct from 'string'
        or not coalesce(e->>'action' = any (array['rencontre','prelevement','capture','liberation','nourrissage','reproduction','deplacement',
             'habitat_perdu','habitat_gagne','defrichage','reboisement','assechement','irrigation','construction','transformation',
             'blessure','effarouchement','pillage','attaque','joueur_tombe']), false)   -- (docs/50) les cinq dernières : la mémoire
        or coalesce(jsonb_typeof(e->'taxon'), 'string') <> 'string' or coalesce(jsonb_typeof(e->'vers'), 'string') <> 'string'
        or coalesce(jsonb_typeof(e->'phenotype'), 'string') <> 'string' or coalesce(jsonb_typeof(e->'parcelle'), 'string') <> 'string'
        or coalesce(jsonb_typeof(e->'moyen'), 'string') <> 'string'
        or concat_ws('|', e->>'taxon', e->>'biome', e->>'vers', e->>'parcelle', e->>'phenotype') ~ '(^|\|)(__proto__|constructor|prototype)(\||$)')
  then return jsonb_build_object('ok', false, 'erreur', 'événement mal formé (schemas/pression.schema.json)'); end if;
  perform pg_advisory_xact_lock(hashtext('orvane_deposer:' || j.id));   -- les comptages des quotas qui suivent, sans course entre deux dépôts
  pseudo := left(encode(extensions.digest(j.id || ':' || p_compte || ':orvane', 'sha256'), 'hex'), 16);   -- Orvane distingue les joueurs, sans savoir qui ils sont
  select count(*) into n from public.orvane_lots where jeu = j.id and compte = pseudo and recu > now() - interval '1 day';
  if n >= 48 then return jsonb_build_object('ok', false, 'erreur', 'trop de dépôts aujourd''hui pour ce joueur'); end if;
  select count(*) into n from public.orvane_lots where jeu = j.id and recu > now() - interval '1 day';
  if n >= j.quota_jour then return jsonb_build_object('ok', false, 'erreur', 'quota du jeu atteint pour aujourd''hui'); end if;
  insert into public.orvane_lots (jeu, compte, monde, lot) values (j.id, pseudo, left(coalesce(p_lot->>'monde', 'orvane'), 40), p_lot - 'source');
  return jsonb_build_object('ok', true);
end $$;

-- === ce qu'Orvane sait d'un jeu (sa clé publique suffit) ===
create or replace function public.orvane_jeu(p_cle text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce((select jsonb_build_object('ok', true, 'jeu', id, 'nom', nom, 'actif', actif, 'exposition', exposition) from public.orvane_jeux where cle = p_cle),
    jsonb_build_object('ok', false, 'erreur', 'clé de jeu inconnue'))
$$;

-- === l'action nocturne : les lots d'un monde, après le dernier lu ; et les jeux ===
create or replace function public.orvane_lire_lots(p_secret text, p_monde text, p_apres bigint default 0, p_limite int default 1000)
returns table (id bigint, jeu text, compte text, lot jsonb, recu timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not orvane_prive.secret_ok(p_secret) then raise exception 'secret invalide' using errcode = '42501'; end if;
  -- (seulement les lots arrivés depuis plus de deux minutes : un dépôt encore en cours, dont l'identifiant est plus petit qu'un autre
  -- déjà visible, ne sera pas sauté ; seulement ceux des jeux actifs : suspendre un jeu écarte aussi ses lots en attente)
  return query select o.id, o.jeu, o.jeu || ':' || o.compte, o.lot, o.recu from public.orvane_lots o join public.orvane_jeux g on g.id = o.jeu and g.actif
    where o.monde = p_monde and o.id > coalesce(p_apres, 0) and o.recu < now() - interval '2 minutes' order by o.id limit least(greatest(coalesce(p_limite, 1000), 1), 1000);
end $$;
create or replace function public.orvane_lire_jeux(p_secret text) returns table (id text, nom text, actif boolean, exposition jsonb)
language plpgsql stable security definer set search_path = public as $$
begin
  if not orvane_prive.secret_ok(p_secret) then raise exception 'secret invalide' using errcode = '42501'; end if;
  return query select g.id, g.nom, g.actif, g.exposition from public.orvane_jeux g order by g.id;
end $$;

-- === les noms (docs/37) : le premier joueur qui décrit une lignée lui donne son nom commun ===
-- Une proposition est gardée telle qu'elle arrive ; c'est le cycle de nuit qui retient la première valable de chaque lignée (la
-- lignée existe, elle était publiée quand on l'a proposée, le nom n'est pas déjà pris, la modération ne l'a pas refusé). Le jeu
-- sait tout de suite si quelqu'un l'a devancé (« deja ») : il peut le dire au joueur.
create table if not exists public.orvane_noms (
  id     bigserial primary key,
  jeu    text not null references public.orvane_jeux (id),
  compte text not null,                                    -- pseudonyme, comme pour les lots
  monde  text not null,
  taxon  text not null,
  nom    text not null,
  auteur text,                                             -- le nom que le joueur veut voir écrit (facultatif, public)
  recu   timestamptz not null default now()
);
create index if not exists orvane_noms_monde_id on public.orvane_noms (monde, id);
create index if not exists orvane_noms_monde_taxon on public.orvane_noms (monde, taxon);
create index if not exists orvane_noms_jeu_compte_recu on public.orvane_noms (jeu, compte, recu);
alter table public.orvane_noms enable row level security;
revoke all on public.orvane_noms from anon, authenticated;
revoke all on sequence public.orvane_noms_id_seq from anon, authenticated;

create or replace function public.orvane_nommer(p_cle text, p_compte text, p_monde text, p_taxon text, p_nom text, p_auteur text default null) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare j public.orvane_jeux; pseudo text; n int; nom text; deja boolean;
begin
  select * into j from public.orvane_jeux where cle = p_cle;
  if j.id is null then return jsonb_build_object('ok', false, 'erreur', 'clé de jeu inconnue'); end if;
  if not j.actif then return jsonb_build_object('ok', false, 'erreur', 'ce jeu est suspendu'); end if;
  if p_compte is null or length(p_compte) < 1 or length(p_compte) > 128 then return jsonb_build_object('ok', false, 'erreur', 'compte : 1 à 128 caractères'); end if;
  if p_taxon is null or p_taxon !~ '^[a-z0-9][a-z0-9._~-]{0,119}$' then return jsonb_build_object('ok', false, 'erreur', 'lignée : son identifiant dans l''instantané'); end if;
  nom := regexp_replace(trim(coalesce(p_nom, '')), '\s+', ' ', 'g');
  if length(nom) < 2 or length(nom) > 40 or nom !~ '^[[:alpha:]][[:alpha:] ''’-]*[[:alpha:]]$' then
    return jsonb_build_object('ok', false, 'erreur', 'nom : 2 à 40 lettres, espaces, apostrophes ou traits d''union'); end if;
  if p_auteur is not null and length(p_auteur) > 40 then return jsonb_build_object('ok', false, 'erreur', 'auteur : 40 caractères au plus'); end if;
  perform pg_advisory_xact_lock(hashtext('orvane_nommer:' || j.id));
  pseudo := left(encode(extensions.digest(j.id || ':' || p_compte || ':orvane', 'sha256'), 'hex'), 16);
  select count(*) into n from public.orvane_noms where jeu = j.id and compte = pseudo and recu > now() - interval '1 day';
  if n >= 10 then return jsonb_build_object('ok', false, 'erreur', 'dix noms par jour et par joueur'); end if;
  select count(*) into n from public.orvane_noms where jeu = j.id and recu > now() - interval '1 day';
  if n >= greatest(j.quota_jour / 10, 100) then return jsonb_build_object('ok', false, 'erreur', 'quota de noms du jeu atteint pour aujourd''hui'); end if;
  deja := exists (select 1 from public.orvane_noms where monde = left(coalesce(p_monde, 'orvane'), 40) and taxon = p_taxon);
  insert into public.orvane_noms (jeu, compte, monde, taxon, nom, auteur) values (j.id, pseudo, left(coalesce(p_monde, 'orvane'), 40), p_taxon, nom, nullif(trim(p_auteur), ''));
  return jsonb_build_object('ok', true, 'deja', deja,
    'note', case when deja then 'un autre joueur a proposé un nom avant vous : le sien sera retenu s''il est valable' else 'le nom sera retenu au prochain cycle s''il est valable' end);
end $$;

create or replace function public.orvane_lire_noms(p_secret text, p_monde text, p_apres bigint default 0, p_limite int default 1000)
returns table (id bigint, jeu text, compte text, auteur text, taxon text, nom text, recu timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not orvane_prive.secret_ok(p_secret) then raise exception 'secret invalide' using errcode = '42501'; end if;
  return query select o.id, o.jeu, o.jeu || ':' || o.compte, o.auteur, o.taxon, o.nom, o.recu from public.orvane_noms o join public.orvane_jeux g on g.id = o.jeu and g.actif
    where o.monde = p_monde and o.id > coalesce(p_apres, 0) and o.recu < now() - interval '2 minutes' order by o.id limit least(greatest(coalesce(p_limite, 1000), 1), 1000);
end $$;
revoke all on function public.orvane_nommer(text, text, text, text, text, text), public.orvane_lire_noms(text, text, bigint, int) from public;
grant execute on function public.orvane_nommer(text, text, text, text, text, text), public.orvane_lire_noms(text, text, bigint, int) to anon, authenticated;

-- === qui peut appeler quoi : les jeux (anon) déposent et s'inscrivent ; la lecture demande le secret ===
revoke all on function public.orvane_inscrire_jeu(text, text), public.orvane_regler_jeu(text, jsonb, text), public.orvane_deposer(text, text, jsonb),
  public.orvane_jeu(text), public.orvane_lire_lots(text, text, bigint, int), public.orvane_lire_jeux(text), orvane_prive.secret_ok(text) from public;
grant execute on function public.orvane_inscrire_jeu(text, text), public.orvane_regler_jeu(text, jsonb, text), public.orvane_deposer(text, text, jsonb),
  public.orvane_jeu(text), public.orvane_lire_lots(text, text, bigint, int), public.orvane_lire_jeux(text) to anon, authenticated;

-- === le volume (5 novembre) : un jeu neuf commence à 500 lots par jour (relevé à la main pour un jeu qui en a besoin :
-- update public.orvane_jeux set quota_jour = 20000 where id = '…') ; les lots lus depuis longtemps sont effacés ===
alter table public.orvane_jeux alter column quota_jour set default 500;
-- (pg_cron, s'il est disponible : chaque jour, les lots de plus de 14 jours et les noms de plus de 90 jours ; sans lui, rien ne
-- casse, et la même requête peut se lancer à la main)
do $$ begin
  create extension if not exists pg_cron;
  perform cron.schedule('orvane-purge', '41 5 * * *', 'delete from public.orvane_lots where recu < now() - interval ''14 days''; delete from public.orvane_noms where recu < now() - interval ''90 days''');
exception when others then raise notice 'pg_cron indisponible : la purge des vieux lots se fera à la main (%).', sqlerrm;
end $$;
