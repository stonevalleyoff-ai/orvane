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
