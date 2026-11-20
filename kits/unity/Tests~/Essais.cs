// Les essais du kit Unity, hors de Unity : dotnet run --project kits/unity/Tests~ -- <dossier où écrire les lots>
// Il lit les vrais instantanés du dépôt, vérifie qu'un champ inconnu ne casse rien, compte des événements, fait des lots, les
// sauve et les reprend, et lit les souches (docs/18). Les lots écrits sont ensuite vérifiés contre le contrat par outils/verifier.js
// (kits/essayer.sh).
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Orvane;

static class Essais
{
    static int echecs = 0;
    static void Verif(bool c, string m) { Console.WriteLine((c ? "  ✓ " : "  ✗ ") + m); if (!c) echecs++; }

    static int Main(string[] args)
    {
        var racine = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../../.."));
        if (!File.Exists(Path.Combine(racine, "package.json"))) racine = Path.GetFullPath(Path.Combine(Directory.GetCurrentDirectory(), "../.."));
        var sortie = args.Length > 0 ? args[0] : Path.Combine(Path.GetTempPath(), "orvane-kit-unity");
        Directory.CreateDirectory(sortie);

        Console.WriteLine("1. Lire le monde");
        foreach (var f in new[] { "mondes/orvane/instantane.json", "mondes/genese-7/instantane.json", "mondes/genese-2026/instantane.json" })
        {
            var texte = File.ReadAllText(Path.Combine(racine, f)); var brut = JObject.Parse(texte);
            var I = Instantane.Lire(texte);
            int n = ((JArray)brut["taxons"]).Count, vivantes = ((JArray)brut["taxons"]).Count(t => t["eteint"] == null || t["eteint"].Type == JTokenType.Null);
            var b = I.Biomes.First().Id; var dans = I.Dans(b).ToList();
            Verif(I.Lignees.Count == n && I.Vivantes().Count() == vivantes && I.Cycle.N == (int)brut["cycle"]["n"] && I.Majeur >= 0 && dans.Count > 0,
                $"{f} : cycle {I.Cycle.N}, contrat {I.Contrat}, {I.Lignees.Count} lignées dont {I.Vivantes().Count()} vivantes, {I.Biomes.Count} biomes ; {dans.Count} lignées en {b} ; monde {I.Identite}");
            var t0 = I.Vivantes().First(); var e = t0.Effectif();
            Verif(e > 0 && t0.Plan != null && t0.Plan.MasseKg > 0 && t0.Phenotypes.Count > 0 && t0.Plan.Corps != null,
                $"  {t0.Nom} : {e:0} bêtes, {t0.Plan.MasseKg} kg, {t0.Plan.Regime}, forme {t0.Plan.Corps?["forme"]}, {t0.Phenotypes.Count} variantes");
        }

        Console.WriteLine("2. Un jeu ignore ce qu'il ne connaît pas");
        {
            var brut = JObject.Parse(File.ReadAllText(Path.Combine(racine, "mondes/genese-7/instantane.json")));
            brut["champ_du_futur"] = new JObject { ["x"] = 1 }; brut["taxons"][0]["autre_chose"] = "nouveau"; brut["taxons"][0]["populations"][0]["un_nombre"] = 3.5;
            brut["taxons"][0]["plan"]["regime"] = "un_regime_neuf"; brut["biomes"][0]["milieu"] = "nuageux";
            var I = Instantane.Lire(brut.ToString());
            Verif(I.Autres.ContainsKey("champ_du_futur") && I.Lignees[0].Autres.ContainsKey("autre_chose") && I.Lignees[0].Populations[0].Autres.ContainsKey("un_nombre")
                  && I.Lignees[0].Plan.Regime == "un_regime_neuf" && I.Biomes[0].Milieu == "nuageux",
                "des champs et des valeurs inconnus se lisent sans erreur, et restent dans Autres");
        }

        Console.WriteLine("3. Compter, faire des lots, les garder");
        {
            var I = Instantane.Lire(File.ReadAllText(Path.Combine(racine, "mondes/genese-7/instantane.json")));
            var c = new Compteur("essai-unity", I.Monde.Id) { Instantane = I.Cycle.N, Zone = "carte:1" };
            var L = I.Vivantes().SelectMany(t => t.Populations.Select(p => (t, p))).Take(700).ToList();
            foreach (var (t, p) in L) { c.Compter(t.Id, p.Biome, Actions.Rencontre, 3); c.Compter(t.Id, p.Biome, Actions.Rencontre, 2); }
            c.Compter(L[0].t.Id, L[0].p.Biome, Actions.Prelevement, 1, L[0].t.Phenotypes[0].Id, null, "adulte");
            c.Milieu(L[0].p.Biome, Actions.Defrichage, 4);
            c.Deplacer(L[1].t.Id, L[1].p.Biome, I.Biome(L[1].p.Biome).Voisins.FirstOrDefault() ?? L[1].p.Biome, 2);
            var enCours = c.EnCours;
            Verif(enCours == L.Count + 3, $"{L.Count} rencontres de deux fois, additionnées : {enCours} événements (et un prélèvement, un défrichage, un déplacement)");
            var sauve = c.Sauver(); var c2 = new Compteur("essai-unity", I.Monde.Id) { Instantane = I.Cycle.N, Zone = "carte:1" }; c2.Charger(sauve);
            Verif(c2.EnCours == enCours, "sauvé puis repris (le jeu se ferme, il se rouvre) : rien n'est perdu");
            c2.Clore("h:essai"); int k = 0; string lot; var lots = new List<Lot>();
            while ((lot = c2.Prochain()) != null) { File.WriteAllText(Path.Combine(sortie, $"lot-{++k}.json"), lot); lots.Add(Lot.DepuisJson(lot)); c2.Depose(); }
            Verif(k == 2 && lots.All(x => x.Evenements.Count <= Compteur.MaxEvenements) && lots.Sum(x => x.Evenements.Count) == enCours
                  && lots[0].Evenements.First(x => x.Action == Actions.Rencontre).N == 5,
                $"clos : {k} lots de {string.Join(" et ", lots.Select(x => x.Evenements.Count))} événements (500 au plus), une rencontre comptée 3 + 2 = 5");
            var corps = new Branchement { CleJeu = "orv_essai" }.CorpsDepot("h:essai", c.Sauver() == null ? "{}" : File.ReadAllText(Path.Combine(sortie, "lot-1.json")));
            var J = JObject.Parse(corps);
            Verif((string)J["p_cle"] == "orv_essai" && (string)J["p_compte"] == "h:essai" && J["p_lot"]["evenements"] is JArray,
                "l'appel orvane_deposer : p_cle, p_compte, p_lot, en JSON valide");
        }
        Console.WriteLine("4. Les souches");
        {
            // le monde d'Orvane du dépôt, tel qu'il était avant l'infection par parcelle et les événements de souche (les champs retirés),
            // puis tel que le publie Orvane désormais (ses champs, ou des champs posés à la main s'il n'en a pas encore)
            var brut = JObject.Parse(File.ReadAllText(Path.Combine(racine, "mondes/orvane/instantane.json")));
            var avant = (JObject)brut.DeepClone();
            foreach (var p in avant["taxons"].SelectMany(x => x["populations"]).OfType<JObject>()) p.Remove("infection_par_parcelle");
            foreach (var e in ((JArray)avant["evenements"]).OfType<JObject>()) foreach (var k in new[] { "souche", "nature", "nom", "lieux", "hotes", "parcelle" }) e.Remove(k);
            var I = Instantane.Lire(avant.ToString());
            var S = (JObject)avant["monde"]["pathogenes"]["souches"]; var L = I.Souches();
            Verif(L.Count == S.Count && L.Count > 0 && L.Zip(L.Skip(1), (a, b) => a.Infectes >= b.Infectes).All(x => x) && L.All(x => x.Id != null && x.Nom == (string)S[x.Id]["nom"] && x.Hotes.Count > 0) && ReferenceEquals(I.Monde.Pathogenes, I.Monde.Pathogenes),
                $"{L.Count} souches vivantes, les plus répandues d'abord : {string.Join(", ", L.Select(x => $"{x.Nom} ({x.Id}, {x.Infectes:0} infectés, virulence {x.Virulence:0.###})"))} ; lues une fois");
            var s0 = L[0]; var t = I.Vivantes().First(x => x.Populations.Any(p => p.Infections.ContainsKey(s0.Id) && p.Parcelles.Count >= 3)); var p0 = t.Populations.First(p => p.Infections.ContainsKey(s0.Id) && p.Parcelles.Count >= 3);
            var J = (JObject)((JArray)avant["taxons"]).First(x => (string)x["id"] == t.Id)["populations"].First(x => (string)x["biome"] == p0.Biome)["infection"][s0.Id];
            var inf = I.Infection(t.Id, p0.Biome);
            Verif(I.Souche(s0.Id)?.Nom == s0.Nom && I.Souche("souche-inconnue") == null && inf[s0.Id].I == (double)J["i"] && inf[s0.Id].R == (double)J["r"],
                $"une souche par son id ; {t.Nom}, à {p0.Biome} : {inf[s0.Id].I:P2} d'infectés par {s0.Nom}, {inf[s0.Id].R:P2} d'immunisés, comme le dit l'instantané");
            var sain = I.Vivantes().First(x => x.Populations.All(p => p.Infections.Count == 0));
            Verif(I.Infection(sain.Id, sain.Populations[0].Biome).Count == 0 && I.Infection(t.Id, "biome-inconnu").Count == 0 && I.Infection("lignee-inconnue", p0.Biome).Count == 0 && I.Infectes(t.Id, "biome-inconnu") == 0,
                "une lignée sans infection, un biome ou une lignée inconnus : rien, sans erreur");
            var parc = p0.Parcelles.Keys.First();
            Verif(I.Infection(t.Id, parc)[s0.Id].I == inf[s0.Id].I && I.EvenementsDeSouches().Count == 0 && I.Foyers(s0.Id).All(f => f.Parcelle == null) && I.Foyers(s0.Id).Count > 0,
                $"un instantané d'avant : une parcelle ({parc}) a l'infection de son biome ; les foyers sont des biomes ; aucun événement ne dit sa souche");

            // après : l'infection par parcelle et les événements de souche, ceux du monde s'il les a, sinon posés à la main
            var apres = (JObject)brut.DeepClone();
            var pops = apres["taxons"].SelectMany(x => x["populations"].OfType<JObject>().Select(p => (taxon: (string)x["id"], p))).ToList();
            if (!pops.Any(x => x.p["infection_par_parcelle"] is JObject))
            {
                var bp = pops.First(x => x.taxon == t.Id && (string)x.p["biome"] == p0.Biome).p; var P = p0.Parcelles.Keys.ToList();
                bp["infection_par_parcelle"] = new JObject { [P[0]] = new JObject { [s0.Id] = new JObject { ["i"] = 0.2, ["r"] = 0.1 } }, [P[1]] = new JObject { [s0.Id] = new JObject { ["i"] = 0, ["r"] = 0.05 } } };
            }
            var ev = (JArray)apres["evenements"];
            if (!ev.OfType<JObject>().Any(e => e["souche"] != null))
            {
                ev.Add(new JObject { ["type"] = "epidemie", ["taxon"] = t.Id, ["biome"] = p0.Biome, ["souche"] = s0.Id, ["nature"] = "saut_hote", ["detail"] = "la souche passe à une lignée de plus", ["parcelle"] = parc });
                ev.Add(new JObject { ["type"] = "remission", ["taxon"] = t.Id, ["souche"] = "souche-eteinte", ["nature"] = "extinction", ["nom"] = "Éteinose", ["lieux"] = new JArray(p0.Biome), ["hotes"] = new JArray(t.Id), ["detail"] = "la souche Éteinose s'éteint" });
            }
            var N = Instantane.Lire(apres.ToString());
            // une population, une parcelle, une souche qui y a des malades (celles du monde)
            var ou = N.Vivantes().SelectMany(x => x.Populations.Select(p => (t: x, p))).SelectMany(x => x.p.InfectionsParParcelle.SelectMany(q => q.Value.Where(y => y.Value.I > 0).Select(y => (x.t, x.p, parcelle: q.Key, souche: y.Key, part: y.Value)))).First();
            var a = N.Infection(ou.t.Id, ou.parcelle)[ou.souche]; var n = N.Infectes(ou.t.Id, ou.parcelle, ou.souche);
            var vide = ou.p.Parcelles.Keys.FirstOrDefault(q => !ou.p.InfectionsParParcelle.ContainsKey(q));
            Verif(a.I == ou.part.I && a.R == ou.part.R && Math.Abs(n - ou.part.I * ou.p.Parcelles[ou.parcelle]) < 1e-9 && (vide == null || N.Infection(ou.t.Id, vide).Count == 0),
                $"par parcelle : {ou.t.Nom}, {ou.parcelle}, {a.I:P2} d'infectés par {ou.souche}, soit {n:0} bêtes" + (vide != null ? $" ; {vide}, aucune" : ""));
            var F = N.Foyers(ou.souche); var immunes = ou.p.InfectionsParParcelle.Where(q => q.Value.TryGetValue(ou.souche, out var y) && y.I == 0).Select(q => q.Key).ToList();
            Verif(F.Any(f => f.Taxon == ou.t.Id && f.Parcelle == ou.parcelle) && !F.Any(f => f.Taxon == ou.t.Id && immunes.Contains(f.Parcelle)) && F.Zip(F.Skip(1), (x, y) => x.Infectes >= y.Infectes).All(x => x) && F.All(f => f.Parcelle != null || !N.Lignee(f.Taxon).Populations.First(p => p.Biome == f.Biome).InfectionsParParcelle.Any()),
                $"les foyers de {ou.souche} : {F.Count}, les plus touchés d'abord, parcelle par parcelle ; une parcelle d'immunisés seulement n'en est pas un");
            var E = N.EvenementsDeSouches(); var fin = E.FirstOrDefault(e => e.Nature == Natures.Extinction); var autre = E.FirstOrDefault(e => e.Nature != Natures.Extinction);
            Verif(E.Count == ev.OfType<JObject>().Count(e => e["souche"] != null) && E.All(e => e.Nature != null) && N.EvenementsDeSouches("souche-inconnue").Count == 0 && N.Evenements.Where(e => e.Souche == null).All(e => e.Nature == null)
                  && (fin == null || (fin.Nom != null && fin.Lieux.Count > 0 && N.NomDe(fin) == fin.Nom)) && (autre == null || N.NomDe(autre) == N.Souche(autre.Souche)?.Nom),
                $"ce qui est arrivé aux souches au dernier cycle : {string.Join(", ", E.Select(e => $"{e.Nature} de {N.NomDe(e) ?? e.Souche}{(e.Lieux.Count > 0 ? $" ({string.Join(", ", e.Lieux)})" : "")}"))}");

            // une souche mal formée (une virulence « forte », une souche qui n'est pas un objet) : laissée de côté, sans erreur
            var mal = (JObject)avant.DeepClone(); var MS = (JObject)mal["monde"]["pathogenes"]["souches"];
            MS["souche-mal"] = new JObject { ["nom"] = "Malose", ["virulence"] = "forte", ["hotes"] = new JArray(t.Id) }; MS["souche-pas-objet"] = 3; MS["souche-hotes"] = new JObject { ["nom"] = "Hotose", ["hotes"] = 7 };
            Instantane M = null; string erreur = null; try { M = Instantane.Lire(mal.ToString()); M.Souches(); } catch (Exception x) { erreur = x.Message; }
            Verif(erreur == null && M.Souches().Count == L.Count && M.Souche("souche-mal") == null && M.Souche("souche-pas-objet") == null && M.Souche("souche-hotes") == null && M.Souche(s0.Id)?.Nom == s0.Nom,
                erreur ?? "trois souches mal formées : laissées de côté, sans erreur ; les autres se lisent");
            var G = Instantane.Lire(File.ReadAllText(Path.Combine(racine, "mondes/genese-7/instantane.json")));
            Verif(G.Monde.Pathogenes == null && G.Souches().Count == 0 && G.Foyers("souche-1").Count == 0, "un monde sans souches : aucune, sans erreur");
        }

        Console.WriteLine(echecs == 0 ? "\ntout passe" : $"\nÉCHEC : {echecs}");
        return echecs == 0 ? 0 : 1;
    }
}
