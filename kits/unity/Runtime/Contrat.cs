// Orvane — LE CONTRAT EN C# (kits/unity/Runtime/Contrat.cs) — docs/44
// Ce qu'Orvane publie (l'instantané) et ce qu'un jeu lui renvoie (le lot), en classes C#. Les noms JSON restent ceux du contrat, en
// français ; les champs C# sont en PascalCase. Un jeu ignore ce qu'il ne connaît pas (docs/43) : tout ce que ces classes ne nomment
// pas est gardé dans Autres, sans erreur. Les détails (le corps, le régime en spectre, les groupes) restent en JObject : on les lit
// au besoin, sans qu'un ajout au contrat casse la lecture.
// Newtonsoft.Json : dans Unity, le paquet com.unity.nuget.newtonsoft-json ; ailleurs, le paquet NuGet Newtonsoft.Json.
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

namespace Orvane
{
    /// <summary>L'état du vivant d'un monde à un cycle (schemas/instantane.schema.json, docs/1).</summary>
    public class Instantane
    {
        [JsonProperty("orvane")] public string Contrat;                       // la version du contrat, « 1.0 »
        [JsonProperty("monde")] public Monde Monde;
        [JsonProperty("cycle")] public Cycle Cycle;
        [JsonProperty("biomes")] public List<Biome> Biomes = new List<Biome>();
        [JsonProperty("catalogue")] public JObject Catalogue;                 // les traits portés, leurs effets (docs/1)
        [JsonProperty("taxons")] public List<Lignee> Lignees = new List<Lignee>();
        [JsonProperty("evenements")] public List<Evenement> Evenements = new List<Evenement>();
        [JsonExtensionData] public IDictionary<string, JToken> Autres;

        /// <summary>Lit un instantané (le texte de instantane.json).</summary>
        public static Instantane Lire(string json) => JsonConvert.DeserializeObject<Instantane>(json);

        /// <summary>Le premier chiffre de la version du contrat : tant qu'il est celui que le jeu connaît, rien ne casse.</summary>
        public int Majeur => int.TryParse((Contrat ?? "0").Split('.')[0], NumberStyles.Integer, CultureInfo.InvariantCulture, out var m) ? m : 0;

        /// <summary>L'identité du monde : si elle change, le monde a été refait de zéro (le jeu repart de generation-0.json).</summary>
        public string Identite => (Monde?.Id ?? "") + "@" + (Monde?.Ne ?? "");

        /// <summary>Les lignées vivantes (une lignée éteinte reste listée dix cycles).</summary>
        public IEnumerable<Lignee> Vivantes() => Lignees.Where(t => t.Eteint == null);

        /// <summary>Les lignées vivantes d'un biome, avec leur population dans ce biome.</summary>
        public IEnumerable<(Lignee lignee, Population population)> Dans(string biome) =>
            Vivantes().SelectMany(t => t.Populations.Where(p => p.Biome == biome).Select(p => (t, p)));

        public Lignee Lignee(string id) => Lignees.FirstOrDefault(t => t.Id == id);
        public Biome Biome(string id) => Biomes.FirstOrDefault(b => b.Id == id);

        // --- les souches : les maladies du monde, où elles frappent, ce qui leur arrive (docs/18) ---
        // Les mêmes réponses que moteur/pathogenes.js et le kit Godot. lieu : un biome (« mangrove »), ou une parcelle (« mangrove~2 »)
        // dans un monde à parcelles. Ce qui manque (une lignée, un lieu, une souche inconnus, un monde sans souches) donne une réponse
        // vide, jamais une erreur.

        /// <summary>Les souches vivantes, les plus répandues d'abord (à égalité, la plus ancienne) ; vide : un monde sans souches.</summary>
        public List<Souche> Souches()
        {
            var S = Monde?.Pathogenes?.Souches; if (S == null) return new List<Souche>();
            return S.Values.Where(s => s != null).OrderByDescending(s => s.Infectes).ThenBy(s => s.Apparu).ThenBy(s => s.Id, StringComparer.Ordinal).ToList();
        }

        /// <summary>Une souche par son identifiant (une clé de monde.pathogenes.souches) ; null : inconnue, ou éteinte.</summary>
        public Souche Souche(string id) { var S = Monde?.Pathogenes?.Souches; return id != null && S != null && S.TryGetValue(id, out var s) ? s : null; }

        /// <summary>L'infection d'une lignée dans un lieu, par souche : les parts infectée (I) et immunisée (R). Vide : aucune souche là.
        /// Une parcelle : son infection à elle (populations[].infection_par_parcelle) ; dans un instantané d'avant l'infection par
        /// parcelle, celle de son biome. Plusieurs populations dans le lieu : leur moyenne, pesée par l'effectif.</summary>
        public Dictionary<string, Infection> Infection(string lignee, string lieu) => Infection(Lignee(lignee), lieu);
        public Dictionary<string, Infection> Infection(Lignee lignee, string lieu)
        {
            var (P, q, _) = Ici(lignee, lieu);
            if (q != null) return q.Autre("infection_par_parcelle") is JObject ipp ? Orvane.Infection.Parts(ipp[lieu]) : q.Infections;
            if (P == null) return new Dictionary<string, Infection>();
            if (P.Count == 1) return P[0].Infections;
            var w = P.Select(p => Math.Max(p.Effectif, 1e-9)).ToList(); var W = w.Sum(); var o = new Dictionary<string, Infection>();
            for (int k = 0; k < P.Count; k++)
                foreach (var kv in P[k].Infections)
                {
                    if (!o.TryGetValue(kv.Key, out var z)) o[kv.Key] = z = new Infection();
                    z.I += kv.Value.I * w[k] / W; z.R += kv.Value.R * w[k] / W;
                }
            return o;
        }

        /// <summary>Combien de bêtes d'une lignée sont infectées dans un lieu (un biome ou une parcelle) : par une souche, ou par toutes (null).</summary>
        public double Infectes(string lignee, string lieu, string souche = null) => Infectes(Lignee(lignee), lieu, souche);
        public double Infectes(Lignee lignee, string lieu, string souche = null)
        {
            var (P, q, nq) = Ici(lignee, lieu); if (P == null && q == null) return 0;
            var n = q != null ? nq : P.Sum(p => p.Effectif);
            return n * Infection(lignee, lieu).Where(kv => souche == null || kv.Key == souche).Sum(kv => kv.Value.I);
        }

        /// <summary>Où une souche frappe : chaque parcelle (chaque biome, dans un monde sans parcelles ou un instantané d'avant) où des
        /// bêtes vivantes l'ont, les plus touchées d'abord.</summary>
        public List<Foyer> Foyers(string souche)
        {
            var F = new List<Foyer>(); if (souche == null) return F;
            foreach (var t in Vivantes())
                foreach (var p in t.Populations)
                {
                    if (p == null || !(p.Autre("infection") is JObject inf) || inf.Property(souche) == null) continue;
                    var lieux = new List<(string parcelle, JToken infection, double effectif)>();
                    if (p.Autre("infection_par_parcelle") is JObject ipp) { var pc = p.Parcelles; foreach (var x in ipp.Properties()) lieux.Add((x.Name, x.Value, pc.TryGetValue(x.Name, out var n) ? n : 0)); }
                    else lieux.Add((null, inf, p.Effectif));
                    foreach (var (parcelle, I, N) in lieux)
                        if (Orvane.Infection.Parts(I).TryGetValue(souche, out var y) && y.I > 0)
                            F.Add(new Foyer { Taxon = t.Id, Biome = p.Biome, Parcelle = parcelle, Effectif = N, I = y.I, R = y.R, Infectes = y.I * N });
                }
            return F.OrderByDescending(f => f.Infectes).ThenBy(f => $"{f.Taxon}|{f.Biome}|{f.Parcelle ?? ""}", StringComparer.Ordinal).ToList();
        }

        /// <summary>Ce qui est arrivé aux souches au dernier cycle : les événements qui disent leur souche (Evenement.Souche, Evenement.Nature) ;
        /// d'une seule, si on la nomme. Un instantané d'avant ces champs n'en dit rien.</summary>
        public List<Evenement> EvenementsDeSouches(string souche = null) => Evenements.Where(e => e?.Souche != null && (souche == null || e.Souche == souche)).ToList();

        /// <summary>Le nom de la souche d'un événement : celui que dit l'événement (une souche éteinte), sinon celui de la souche vivante ; null : aucun.</summary>
        public string NomDe(Evenement e) => e?.Nom ?? Souche(e?.Souche)?.Nom;

        // où vit une lignée dans un lieu : les populations du biome ; ou celle dont le biome porte la parcelle, et son effectif là
        (List<Population> biome, Population parcelle, double effectif) Ici(Lignee t, string lieu)
        {
            if (t == null || lieu == null) return (null, null, 0);
            var P = t.Populations.Where(p => p != null && p.Biome == lieu).ToList();
            if (P.Count > 0) return (P, null, 0);
            foreach (var p in t.Populations)
            {
                if (p == null) continue;
                var pc = p.Parcelles;
                if ((p.Autre("infection_par_parcelle") is JObject ipp && ipp.Property(lieu) != null) || pc.ContainsKey(lieu)) return (null, p, pc.TryGetValue(lieu, out var n) ? n : 0);
            }
            return (null, null, 0);
        }
    }

    public class Monde
    {
        [JsonProperty("id")] public string Id;
        [JsonProperty("nom")] public string Nom;
        [JsonProperty("ne")] public string Ne;                                 // la naissance du monde
        [JsonProperty("graine")] public long Graine;
        [JsonProperty("annee")] public int? Annee;                            // la durée d'une année, en cycles
        [JsonProperty("genre")] public string Genre;
        [JsonExtensionData] public IDictionary<string, JToken> Autres;

        /// <summary>Les souches du monde (docs/18) ; null : un monde sans souches. Instantane.Souches() les rend classées. Lues une fois
        /// (gardées pour cet instantané), chacune à la main : une souche illisible (un champ connu d'un autre type) est laissée de côté,
        /// sans erreur.</summary>
        [JsonIgnore] public Pathogenes Pathogenes
        {
            get
            {
                if (pathogenesLus) return pathogenes;
                pathogenesLus = true;
                if (Autres == null || !Autres.TryGetValue("pathogenes", out var p) || !(p is JObject o)) return pathogenes = null;
                var P = new Pathogenes();
                try { var d = o["depuis"]; if (d != null && d.Type != JTokenType.Null) P.Depuis = (int)(d.Value<double?>() ?? 0); } catch (Exception) { }
                if (o["souches"] is JObject S) foreach (var x in S.Properties()) { var s = Souche.Lire(x.Name, x.Value); if (s != null) P.Souches[x.Name] = s; }
                return pathogenes = P;
            }
        }
        Pathogenes pathogenes; bool pathogenesLus;
    }

    /// <summary>Les souches d'un monde (monde.pathogenes, docs/18).</summary>
    public class Pathogenes
    {
        [JsonProperty("depuis")] public int Depuis;                            // le cycle où le monde a reçu ses souches
        [JsonProperty("souches")] public Dictionary<string, Souche> Souches = new Dictionary<string, Souche>();   // les vivantes, par identifiant
        [JsonExtensionData] public IDictionary<string, JToken> Autres;
    }

    /// <summary>Une souche (docs/18) : une maladie, sa virulence, sa contagion, ses hôtes.</summary>
    public class Souche
    {
        [JsonIgnore] public string Id;                                         // sa clé dans monde.pathogenes.souches (souche-3)
        [JsonProperty("nom")] public string Nom;
        [JsonProperty("virulence")] public double Virulence;                   // la part des infectés qui meurent chaque cycle
        [JsonProperty("transmission")] public double Transmission;             // sa contagion
        [JsonProperty("origine")] public string Origine;                       // la lignée où elle est née
        [JsonProperty("apparu")] public int Apparu;                            // le cycle de sa naissance
        [JsonProperty("hotes")] public List<string> Hotes = new List<string>();   // les lignées où elle a pris
        [JsonProperty("infectes")] public double Infectes;                     // combien de bêtes elle infecte dans le monde
        [JsonProperty("parent")] public string Parent;                         // (docs/29) un mutant : la souche dont il est né
        [JsonProperty("vecteur")] public string Vecteur;                       // (docs/29) la lignée d'insectes qui la porte d'une lignée à l'autre
        [JsonExtensionData] public IDictionary<string, JToken> Autres;

        /// <summary>Une souche lue à la main (monde.pathogenes.souches[id]) ; null si elle est illisible : pas un objet, ou un champ connu
        /// d'un autre type (une virulence « forte »). Ce qu'elle porte d'inconnu reste dans Autres.</summary>
        public static Souche Lire(string id, JToken t)
        {
            if (!(t is JObject o)) return null;
            try
            {
                var s = new Souche { Id = id, Nom = Texte(o, "nom"), Virulence = Nombre(o, "virulence") ?? 0, Transmission = Nombre(o, "transmission") ?? 0, Origine = Texte(o, "origine"),
                    Apparu = (int)(Nombre(o, "apparu") ?? 0), Infectes = Nombre(o, "infectes") ?? 0, Parent = Texte(o, "parent"), Vecteur = Texte(o, "vecteur"), Autres = new Dictionary<string, JToken>() };
                var h = o["hotes"];
                if (h is JArray a) s.Hotes = a.Select(x => x.Value<string>()).ToList();
                else if (h != null && h.Type != JTokenType.Null) return null;
                foreach (var p in o.Properties()) if (!Connus.Contains(p.Name)) s.Autres[p.Name] = p.Value;
                return s;
            }
            catch (Exception) { return null; }
        }
        static readonly HashSet<string> Connus = new HashSet<string> { "nom", "virulence", "transmission", "origine", "apparu", "hotes", "infectes", "parent", "vecteur" };
        static string Texte(JObject o, string k) { var v = o[k]; return v == null || v.Type == JTokenType.Null ? null : v.Value<string>(); }
        static double? Nombre(JObject o, string k) { var v = o[k]; return v == null || v.Type == JTokenType.Null ? (double?)null : v.Value<double?>(); }
    }

    /// <summary>Ce qu'une souche fait d'une population (docs/18) : la part de ses bêtes infectées (I) et celle des immunisées (R), de 0 à 1.</summary>
    public class Infection
    {
        [JsonProperty("i")] public double I;
        [JsonProperty("r")] public double R;

        /// <summary>Une infection telle que le contrat la publie ({ souche: { i, r } }), lue sans erreur : chaque part entre 0 et 1.</summary>
        public static Dictionary<string, Infection> Parts(JToken t)
        {
            var o = new Dictionary<string, Infection>(); if (!(t is JObject j)) return o;
            foreach (var p in j.Properties())
                if (p.Value is JObject x) o[p.Name] = new Infection { I = Part(x["i"]), R = Part(x["r"]) };
                else if (EstNombre(p.Value)) o[p.Name] = new Infection { I = Part(p.Value) };
            return o;
        }
        static bool EstNombre(JToken v) => v != null && (v.Type == JTokenType.Float || v.Type == JTokenType.Integer);
        static double Part(JToken v) { if (!EstNombre(v)) return 0; var x = v.Value<double>(); return double.IsNaN(x) ? 0 : Math.Min(1, Math.Max(0, x)); }
    }

    /// <summary>Où une souche frappe : une parcelle (ou un biome entier : Parcelle null) où des bêtes d'une lignée l'ont.</summary>
    public class Foyer
    {
        public string Taxon, Biome, Parcelle;
        public double Effectif, I, R, Infectes;                                // l'effectif du lieu, les parts infectée et immunisée, les bêtes infectées
    }

    /// <summary>Ce qui arrive à une souche (evenements[].nature, docs/18). D'autres pourront venir : un jeu ignore celles qu'il ne connaît pas.</summary>
    public static class Natures
    {
        public const string Naissance = "naissance", SautHote = "saut_hote", Mutation = "mutation", Vecteur = "vecteur", Extinction = "extinction";
    }

    public class Cycle
    {
        [JsonProperty("n")] public int N;
        [JsonProperty("date")] public string Date;
        [JsonProperty("pressions_recues")] public int PressionsRecues;
        [JsonProperty("saison")] public Saison Saison;
        [JsonExtensionData] public IDictionary<string, JToken> Autres;
    }

    public class Saison
    {
        [JsonProperty("phase")] public double Phase;                           // 0 : le cœur de l'hiver ; 0,5 : le cœur de l'été
        [JsonProperty("nom")] public string Nom;
        [JsonProperty("production")] public double Production;
        [JsonExtensionData] public IDictionary<string, JToken> Autres;
    }

    public class Biome
    {
        [JsonProperty("id")] public string Id;
        [JsonProperty("nom")] public string Nom;
        [JsonProperty("milieu")] public string Milieu;                         // terrestre, aquatique, marin, amphibie, souterrain, aerien
        [JsonProperty("axes")] public Dictionary<string, double> Axes = new Dictionary<string, double>();
        [JsonProperty("capacite")] public double Capacite;
        [JsonProperty("voisins")] public List<string> Voisins = new List<string>();
        [JsonExtensionData] public IDictionary<string, JToken> Autres;

        /// <summary>Le temps qu'il fait ici ce cycle (docs/45) ; null : un monde sans météo, ou un lieu sans temps.</summary>
        [JsonIgnore] public Meteo Meteo => Autres != null && Autres.TryGetValue("meteo", out var m) && m != null && m.Type == JTokenType.Object ? m.ToObject<Meteo>() : null;
    }

    /// <summary>Le temps d'un lieu, un cycle (docs/45).</summary>
    public class Meteo
    {
        [JsonProperty("temps")] public string Temps;                           // clair, couvert, pluie, orage, neige, gel, canicule, tempete, brouillard
        [JsonProperty("t")] public double T;                                   // l'écart de chaleur à la saison
        [JsonProperty("e")] public double E;                                   // l'écart d'eau à la saison
        [JsonProperty("vent")] public double Vent;
        [JsonProperty("neige")] public double Neige;                           // le manteau au sol, de 0 à 1
        [JsonProperty("secheresse")] public double Secheresse;                 // le sec qui dure, de 0 à 1
        [JsonProperty("eaux")] public double Eaux;                             // les eaux qui montent, de 0 à 1
        [JsonProperty("production")] public double Production = 1;
        [JsonExtensionData] public IDictionary<string, JToken> Autres;
    }

    /// <summary>Une lignée (un taxon) : son plan, ses populations par biome, ses variantes.</summary>
    public class Lignee
    {
        [JsonProperty("id")] public string Id;                                 // stable : la clé de la table de correspondance du jeu
        [JsonProperty("nom")] public string Nom;
        [JsonProperty("nom_commun")] public string NomCommun;                  // le nom que les joueurs lui ont donné (docs/37)
        [JsonProperty("parent")] public string Parent;
        [JsonProperty("apparu")] public int Apparu;
        [JsonProperty("eteint")] public int? Eteint;
        [JsonProperty("statut")] public string Statut;                         // croissance, stable, declin, menace, eteint
        [JsonProperty("plan")] public Plan Plan;
        [JsonProperty("populations")] public List<Population> Populations = new List<Population>();
        [JsonProperty("phenotypes")] public List<Phenotype> Phenotypes = new List<Phenotype>();
        [JsonExtensionData] public IDictionary<string, JToken> Autres;

        public double Effectif() => Populations.Sum(p => p.Effectif);
        public double Effectif(string biome) => Populations.Where(p => p.Biome == biome).Sum(p => p.Effectif);
    }

    public class Plan
    {
        [JsonProperty("regime")] public string Regime;                         // herbivore, omnivore, carnivore, filtreur, detritivore (charognard), synthetique
        [JsonProperty("masse_kg")] public double MasseKg;
        [JsonProperty("taille_m")] public double TailleM;
        [JsonProperty("locomotion")] public List<string> Locomotion = new List<string>();
        [JsonProperty("activite")] public string Activite;                     // diurne, nocturne, crepusculaire, continue
        [JsonProperty("temperament")] public double Temperament;
        [JsonProperty("sociabilite")] public double Sociabilite;
        [JsonProperty("vitesse_rel")] public double? VitesseRel;
        [JsonProperty("perception")] public double? Perception;
        [JsonProperty("longevite")] public double Longevite;
        [JsonProperty("maturite")] public double Maturite;
        [JsonProperty("corps")] public JObject Corps;                          // la silhouette (docs/11, 33) : forme, pattes, organes, couleurs…
        [JsonExtensionData] public IDictionary<string, JToken> Autres;
    }

    public class Population
    {
        [JsonProperty("biome")] public string Biome;
        [JsonProperty("effectif")] public double Effectif;
        [JsonProperty("tendance")] public double Tendance;
        [JsonProperty("groupe")] public JObject Groupe;                        // la vie en groupe (docs/38)
        [JsonProperty("migration")] public JObject Migration;                  // la route de l'hiver (docs/38)
        [JsonProperty("hivernants")] public Dictionary<string, double> Hivernants;   // la part venue d'ailleurs passer l'hiver (docs/38)
        [JsonExtensionData] public IDictionary<string, JToken> Autres;

        /// <summary>(docs/18) Les souches qui circulent ici : pour chacune, les parts infectée et immunisée. Vide : aucune.</summary>
        [JsonIgnore] public Dictionary<string, Infection> Infections => Infection.Parts(Autre("infection"));
        /// <summary>(docs/15, 18) La même chose, parcelle par parcelle, dans un monde à parcelles ; vide : aucune souche ici, ou un instantané d'avant.</summary>
        [JsonIgnore] public Dictionary<string, Dictionary<string, Infection>> InfectionsParParcelle =>
            Autre("infection_par_parcelle") is JObject j ? j.Properties().ToDictionary(p => p.Name, p => Infection.Parts(p.Value)) : new Dictionary<string, Dictionary<string, Infection>>();
        /// <summary>(docs/15) L'effectif de la population dans chaque parcelle de son biome ; vide : un monde sans parcelles.</summary>
        [JsonIgnore] public Dictionary<string, double> Parcelles =>
            Autre("parcelles") is JObject j ? j.Properties().Where(p => p.Value.Type == JTokenType.Float || p.Value.Type == JTokenType.Integer).ToDictionary(p => p.Name, p => p.Value.Value<double>()) : new Dictionary<string, double>();
        internal JToken Autre(string cle) => Autres != null && Autres.TryGetValue(cle, out var v) ? v : null;
    }

    public class Phenotype
    {
        [JsonProperty("id")] public string Id;
        [JsonProperty("frequence")] public double Frequence;
        [JsonProperty("traits")] public List<string> Traits = new List<string>();
        [JsonProperty("frequence_par_biome")] public Dictionary<string, double> FrequenceParBiome;
        [JsonExtensionData] public IDictionary<string, JToken> Autres;
    }

    public class Evenement
    {
        [JsonProperty("type")] public string Type;                             // apparition, extinction, separation, migration, epidemie…
        [JsonProperty("taxon")] public string Taxon;
        [JsonProperty("biome")] public string Biome;
        [JsonProperty("detail")] public string Detail;
        [JsonExtensionData] public IDictionary<string, JToken> Autres;

        /// <summary>(docs/18) Un événement de souche (epidemie, remission) : laquelle, une clé de monde.pathogenes.souches ; null : ce n'en est pas un.</summary>
        [JsonIgnore] public string Souche => Texte("souche");
        /// <summary>(docs/18) Ce qui lui arrive : Natures.Naissance, SautHote, Mutation, Vecteur, Extinction ; null : pas un événement de souche.</summary>
        [JsonIgnore] public string Nature => Texte("nature");
        /// <summary>(docs/18) Le nom de la souche, que dit l'événement d'une souche qui s'éteint (elle n'est plus dans monde.pathogenes.souches) ;
        /// pour les autres, Instantane.NomDe(evenement).</summary>
        [JsonIgnore] public string Nom => Texte("nom");
        /// <summary>(docs/15) Un monde à parcelles : la parcelle où l'événement est né (Biome est alors le biome dont elle est une part).</summary>
        [JsonIgnore] public string Parcelle => Texte("parcelle");
        /// <summary>(docs/18) Une souche qui s'éteint : les biomes où elle avait encore des malades au début du cycle ; vide sinon.</summary>
        [JsonIgnore] public List<string> Lieux => Textes("lieux");
        /// <summary>(docs/18) Une souche qui s'éteint : les lignées où elle avait pris ; vide sinon.</summary>
        [JsonIgnore] public List<string> Hotes => Textes("hotes");
        string Texte(string cle) => Autres != null && Autres.TryGetValue(cle, out var v) && v != null && v.Type == JTokenType.String ? (string)v : null;
        List<string> Textes(string cle) => Autres != null && Autres.TryGetValue(cle, out var v) && v is JArray a ? a.Where(x => x.Type == JTokenType.String).Select(x => (string)x).ToList() : new List<string>();
    }

    // --- ce que le jeu renvoie ---

    /// <summary>Un lot de pressions : ce qu'ont fait les joueurs, compté (schemas/pression.schema.json, docs/4).</summary>
    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class Lot
    {
        [JsonProperty("orvane")] public string Contrat = "1.0";
        [JsonProperty("monde")] public string Monde = "orvane";
        [JsonProperty("instantane")] public int? Instantane;                   // le cycle.n de l'instantané que le jeu jouait
        [JsonProperty("familles")] public List<string> Familles;               // ce que le jeu joue : animale, synthetique, vegetale
        [JsonProperty("source")] public Source Source = new Source();
        [JsonProperty("periode")] public Periode Periode = new Periode();
        [JsonProperty("evenements")] public List<EvenementLot> Evenements = new List<EvenementLot>();

        public string VersJson() => JsonConvert.SerializeObject(this, Formatting.None);
        public static Lot DepuisJson(string json) => JsonConvert.DeserializeObject<Lot>(json);
    }

    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class Source
    {
        [JsonProperty("jeu")] public string Jeu;
        [JsonProperty("compte")] public string Compte;                         // un identifiant opaque du joueur (un hachage)
        [JsonProperty("zone")] public string Zone;
    }

    public class Periode
    {
        [JsonProperty("debut")] public string Debut;                           // ISO 8601, UTC
        [JsonProperty("fin")] public string Fin;
    }

    [JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
    public class EvenementLot
    {
        [JsonProperty("taxon")] public string Taxon;
        [JsonProperty("phenotype")] public string Phenotype;
        [JsonProperty("biome")] public string Biome;
        [JsonProperty("parcelle")] public string Parcelle;
        [JsonProperty("action")] public string Action;
        [JsonProperty("n")] public double N;
        [JsonProperty("vers")] public string Vers;                             // pour un déplacement
        [JsonProperty("age")] public string Age;
        [JsonProperty("moyen")] public string Moyen;                           // (docs/50) comment : melee, distance, piege, feu, lumiere, bruit
        [JsonProperty("q")] public Dictionary<string, double> Q;               // la valeur moyenne des traits continus des bêtes prises
    }

    /// <summary>Ce que répond Orvane à un dépôt : ok, ou l'erreur.</summary>
    public class Reponse
    {
        [JsonProperty("ok")] public bool Ok;
        [JsonProperty("erreur")] public string Erreur;
        [JsonExtensionData] public IDictionary<string, JToken> Autres;
        public static Reponse Echec(string e) => new Reponse { Ok = false, Erreur = e };
    }

    /// <summary>Les actions d'un lot (docs/4).</summary>
    public static class Actions
    {
        public const string Rencontre = "rencontre", Prelevement = "prelevement", Capture = "capture", Liberation = "liberation",
            Nourrissage = "nourrissage", Reproduction = "reproduction", Deplacement = "deplacement",
            HabitatPerdu = "habitat_perdu", HabitatGagne = "habitat_gagne", Defrichage = "defrichage", Reboisement = "reboisement",
            Assechement = "assechement", Irrigation = "irrigation", Construction = "construction";
        /// <summary>La mémoire (docs/50) : ce que les bêtes vivent des joueurs sans être retirées. À n'envoyer qu'à un monde qui
        /// l'annonce (instantane.monde.memoire) : ailleurs, le serveur refuse le lot entier.</summary>
        public const string Blessure = "blessure", Effarouchement = "effarouchement", Pillage = "pillage", Attaque = "attaque", JoueurTombe = "joueur_tombe";
    }
}
