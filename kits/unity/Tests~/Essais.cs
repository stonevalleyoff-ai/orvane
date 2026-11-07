// Les essais du kit Unity, hors de Unity : dotnet run --project kits/unity/Tests~ -- <dossier où écrire les lots>
// Il lit les vrais instantanés du dépôt, vérifie qu'un champ inconnu ne casse rien, compte des événements, fait des lots, les
// sauve et les reprend. Les lots écrits sont ensuite vérifiés contre le contrat par outils/verifier.js (kits/essayer.sh).
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
        Console.WriteLine(echecs == 0 ? "\ntout passe" : $"\nÉCHEC : {echecs}");
        return echecs == 0 ? 0 : 1;
    }
}
