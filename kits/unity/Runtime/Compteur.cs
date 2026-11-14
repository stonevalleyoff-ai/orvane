// Orvane — LE COMPTEUR D'UN JEU (kits/unity/Runtime/Compteur.cs) — docs/44
// Le jeu compte ce que font ses joueurs, au moment où ça arrive (docs/4) : une rencontre par bête vue, un prélèvement par bête
// tuée… Le compteur additionne ce qui se ressemble (la même lignée, le même biome, la même action) et fait des lots, de 500
// événements au plus (ce qu'Orvane accepte d'un coup). Les lots pas encore déposés se gardent : Sauver() les rend en texte, à
// ranger où le jeu range ses sauvegardes, et Charger() les reprend au lancement suivant. Rien n'est perdu si le réseau manque.
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using Newtonsoft.Json;

namespace Orvane
{
    public class Compteur
    {
        public const int MaxEvenements = 500;
        public string Jeu, Monde = "orvane", Zone;
        public int? Instantane;                          // le cycle.n de l'instantané que joue le jeu
        public List<string> Familles = new List<string> { "animale" };
        readonly Dictionary<string, EvenementLot> evenements = new Dictionary<string, EvenementLot>();
        readonly List<string> enAttente = new List<string>();   // les lots faits, pas encore déposés (en JSON)
        DateTime debut = DateTime.UtcNow;

        public Compteur(string jeu, string monde = "orvane") { Jeu = jeu; Monde = monde; }

        /// <summary>Ce que le jeu a vu ou fait à une bête d'une lignée, dans un biome d'Orvane (déjà traduit).</summary>
        public void Compter(string taxon, string biome, string action, double n = 1, string phenotype = null, string parcelle = null, string age = null, string moyen = null)
        {
            if (string.IsNullOrEmpty(biome) || string.IsNullOrEmpty(action) || !(n > 0)) return;
            var cle = string.Join("|", taxon, phenotype, biome, parcelle, action, age, moyen);
            if (evenements.TryGetValue(cle, out var e)) e.N += n;
            else evenements[cle] = new EvenementLot { Taxon = taxon, Phenotype = phenotype, Biome = biome, Parcelle = parcelle, Action = action, N = n, Age = age, Moyen = moyen };
        }
        /// <summary>Ce que le joueur a fait au milieu (défricher, assécher, construire…) : sans lignée, en unités de surface.</summary>
        public void Milieu(string biome, string action, double n, string parcelle = null) => Compter(null, biome, action, n, null, parcelle);
        /// <summary>Une bête emportée d'un biome à un autre.</summary>
        public void Deplacer(string taxon, string depuis, string vers, double n = 1)
        {
            if (!(n > 0)) return; var cle = string.Join("|", taxon, depuis, "deplacement", vers);
            if (evenements.TryGetValue(cle, out var e)) e.N += n;
            else evenements[cle] = new EvenementLot { Taxon = taxon, Biome = depuis, Action = Actions.Deplacement, Vers = vers, N = n };
        }

        public int EnCours => evenements.Count;
        public int LotsEnAttente => enAttente.Count;

        /// <summary>Clôt ce qui a été compté en lots (pour ce joueur) et les met en attente de dépôt.</summary>
        public void Clore(string compte)
        {
            if (evenements.Count == 0) return;
            var fin = DateTime.UtcNow; var tous = evenements.Values.ToList();
            for (int i = 0; i < tous.Count; i += MaxEvenements)
            {
                var lot = new Lot { Monde = Monde, Instantane = Instantane, Familles = Familles?.ToList(),
                    Source = new Source { Jeu = Jeu, Compte = compte, Zone = Zone },
                    Periode = new Periode { Debut = Iso(debut), Fin = Iso(fin) },
                    Evenements = tous.Skip(i).Take(MaxEvenements).Select(e => { e.N = Math.Min(10000, Math.Round(e.N, 3)); return e; }).ToList() };
                enAttente.Add(lot.VersJson());
            }
            evenements.Clear(); debut = fin;
        }

        /// <summary>Le prochain lot à déposer (null s'il n'y en a pas). Il reste en attente tant que Depose() n'a pas été appelé.</summary>
        public string Prochain() => enAttente.Count > 0 ? enAttente[0] : null;
        /// <summary>Orvane a répondu ok : le lot est oublié.</summary>
        public void Depose() { if (enAttente.Count > 0) enAttente.RemoveAt(0); }

        /// <summary>Les lots en attente et ce qui est compté, en texte : à garder avec la sauvegarde du jeu.</summary>
        public string Sauver() => JsonConvert.SerializeObject(new Sauvegarde { Lots = enAttente.ToList(), Evenements = evenements.Values.ToList(), Debut = Iso(debut) });
        public void Charger(string texte)
        {
            if (string.IsNullOrEmpty(texte)) return; var s = JsonConvert.DeserializeObject<Sauvegarde>(texte); if (s == null) return;
            enAttente.AddRange(s.Lots ?? new List<string>());
            foreach (var e in s.Evenements ?? new List<EvenementLot>())
                if (e.Action == Actions.Deplacement) Deplacer(e.Taxon, e.Biome, e.Vers, e.N); else Compter(e.Taxon, e.Biome, e.Action, e.N, e.Phenotype, e.Parcelle, e.Age, e.Moyen);
            if (DateTime.TryParse(s.Debut, CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal, out var d) && d < debut) debut = d;
        }

        static string Iso(DateTime t) => t.ToUniversalTime().ToString("yyyy-MM-dd'T'HH:mm:ss'Z'", CultureInfo.InvariantCulture);
        class Sauvegarde { public List<string> Lots; public List<EvenementLot> Evenements; public string Debut; }
    }
}
