// Orvane — les types du contrat. Fichier ÉCRIT par outils/types.js d'après schemas/*.schema.json : ne pas le modifier à la main.
// Un traducteur TypeScript : import type { Instantane, Lot, Profil } from './orvane';  — en JavaScript : /** @type {import('./orvane').Instantane} */
// Chaque champ porte la description de son schéma. Les noms restent ceux du contrat (en français) ; docs/glossary.md les traduit.

export type InstantaneUnite = number;

/** Orvane — instantané (sortie du moteur) — L'état du vivant d'un monde à un cycle donné. Orvane ne connaît aucun jeu : tout est biologie abstraite. Le traducteur du jeu lit ce fichier et en fait des données jouables. */
export interface Instantane {
  /** Version du contrat, MAJEUR.MINEUR : « 1.0 » depuis le 7 novembre 2026 (« 0.1 » avant ; docs/43). Même majeur, rien ne casse : un jeu ignore ce qu'il ne connaît pas. */
  orvane: string;
  monde: {
    /** Un monde par jeu : identifiant stable du monde. */
    id: string;
    /** Graine du monde. Même graine + mêmes pressions ⇒ même histoire. */
    graine: number;
    nom?: string;
    /** Durée de l’année en cycles (0 ou absent : pas de saisons). Phase 0 = plein hiver, 0,5 = plein été. */
    annee?: number;
    /** Si le monde est né de la genèse (moteur/genese.js) : combien de cycles, quelle graine, quels ancêtres. */
    genese?: {
      cycles?: number;
      graine?: number;
      ancetres?: string[];
      /** L'écart dont les cycles de la genèse et du rodage ont été recalés : une lignée née avant la génération 0 a un cycle d'apparition négatif. */
      recale?: number;
    };
    /** La naissance du monde (le premier cycle, posé par hebergement/cycle.js). Avec l'id, c'est l'identité d'un monde : un monde refait de zéro garde son id mais change de date — les traducteurs repartent alors de sa nouvelle génération 0. */
    ne?: string;
    /** Les règles du moteur propres à ce monde (REGLES de moteur/orvane.js), choisies par sa genèse : elles valent pour chacun de ses cycles, où qu'il tourne. */
    regles?: {
      [cle: string]: unknown;
    };
    /** (docs/41) Le genre pour lequel ce monde est réglé (moteur/genres.js) : ses règles sont dans regles. */
    genre?: string;
    /** Les fusions qu'a reçues ce monde (moteur/fusion.js, docs/14) : d'un autre monde, des lignées sont arrivées dans certains biomes, au cycle dit. Une fusion n'est appliquée qu'une fois. */
    fusions?: {
      /** Le nom de la fusion (profil.monde.fusions[].id). */
      id: string;
      /** L'id du monde d'où viennent les lignées. */
      monde: string;
      nom?: string;
      /** Le cycle de la cible où les lignées sont arrivées. */
      cycle: number;
      /** La part des effectifs de la source qui est arrivée. */
      part?: number;
      biomes?: string[];
      lignees: number;
      /** (docs/23) ponts : la source est devenue un continent du monde, relié par quelques ponts ; absent : biome par biome (docs/14). */
      mode?: "biomes" | "ponts";
      /** (docs/23) Les ponts : [parcelle de la source, parcelle de la cible]. */
      ponts?: string[][];
    }[];
    /** Le monde tourne par parcelles (moteur/parcelles.js, docs/15) : chaque biome est découpé en parcelles voisines. L'instantané publié reste par biome ; la liste des parcelles est dans « parcelles », et chaque population dit sa répartition. */
    parcelles?: {
      /** Le nombre de parcelles par biome (ou par biome : { prairie: 6, … }). */
      par?: number | {
        [cle: string]: unknown;
      };
      graine?: number;
      /** Le nombre de parcelles du monde. */
      nombre?: number;
      /** (dans l'état interne seulement) les biomes d'avant le découpage. */
      types?: unknown[];
    };
    /** La Mère (docs/16) : d'où vient toute la vie synthétique. Elle ne meurt pas. */
    mere?: {
      nom?: string;
      /** là où elle est (le biome ; « parcelle » dit la parcelle) */
      biome?: string;
      parcelle?: string;
      depuis?: number;
      /** les plans qu'elle a conçus */
      conceptions?: number;
      /** les plans qu'elle assemble */
      courant?: string[];
      prochaine?: number;
      derniere?: {
        [cle: string]: unknown;
      };
      /** ce qui tue ses machines, par cause (usure, energie, catastrophe, joueurs) : les morts par machine et par cycle ; debord, masse_debord : ce qui déborde sans régulateur, et sa taille */
      memoire?: {
        [cle: string]: number;
      };
    };
    /** La flore (docs/17) : depuis quand, combien de lignées à l'éveil. */
    flore?: {
      depuis?: number;
      lignees?: number;
    };
    /** Les souches du monde (docs/18). */
    pathogenes?: {
      depuis?: number;
      prochain?: number;
      souches?: {
        [cle: string]: {
          nom?: string;
          /** la part des infectés qui meurent chaque cycle */
          virulence?: number;
          transmission?: number;
          /** la lignée où elle est née */
          origine?: string;
          apparu?: number;
          /** les lignées où elle a pris */
          hotes?: string[];
          infectes?: number;
          /** (docs/29) un mutant : la souche dont il est né */
          parent?: string;
          /** (docs/29) la lignée d'insectes qui la porte, sans en tomber malade, d'une lignée à l'autre et d'un lieu à l'autre */
          vecteur?: string;
        };
      };
    };
    /** Un monde solo (moteur/solo.js, docs/19) : le monde partagé dont il est parti, et à quel cycle. Il vit sa vie ; rien n'en revient au monde partagé. */
    solo?: {
      depuis?: string | null;
      cycle?: number;
    };
    /** Le milieu transformé (docs/22) : depuis quand les bêtes et les joueurs changent les axes des lieux. */
    milieu?: {
      depuis?: number;
    };
    /** (docs/25) Pondre ou mettre bas : depuis quand. */
    ponte?: {
      depuis?: number;
    };
    /** (docs/26) Les cycles de vie : depuis quand. */
    stades?: {
      depuis?: number;
    };
    /** (docs/27) Un monde inventif : depuis quand. */
    invention?: {
      depuis?: number;
    };
    /** (docs/34) L'esprit : depuis quand. */
    esprit?: {
      depuis?: number;
    };
    /** (docs/38) La vie en groupe est publiée (populations[].groupe, populations[].migration, biomes[].visiteurs) : depuis quand. */
    collectif?: {
      depuis?: number;
    };
    /** (docs/33) Les castes : depuis quand. */
    castes?: {
      depuis?: number;
    };
    /** (docs/33) Les formes nouvelles : depuis quand. */
    formes?: {
      depuis?: number;
    };
    /** (docs/32) La grammaire des effets et des conduites : depuis quand. */
    grammaire?: {
      depuis?: number;
    };
    /** (docs/31) Le climat : depuis quand, l'écart de température et d'humidité de tout le monde depuis l'éveil, la marche au hasard, les ponts de terre émergés (ponts), le nombre d'îles nées (iles). */
    climat?: {
      [cle: string]: unknown;
    };
    /** (docs/45) La météo : depuis quand chaque lieu a son temps du cycle. */
    meteo?: {
      depuis?: number;
    };
    /** (docs/47) Les plantes subissent et transforment : depuis quand. */
    succession?: {
      depuis?: number;
    };
    /** (docs/46) Les saisons des plantes : depuis quand. */
    phenologie?: {
      depuis?: number;
    };
    /** (docs/30) Les régimes en spectre : depuis quand. */
    dietes?: {
      depuis?: number;
    };
    /** (docs/29) Les dérives : depuis quand. */
    derives?: {
      depuis?: number;
    };
    /** (docs/28) Les lieux qui changent de nature : depuis quand, et les types de lieux du monde (nom, milieu, axes, saisons), ceux d'origine et ceux qu'il a inventés (inedit, de : le type le plus proche, apparu : le cycle) ; continent : celui d'un type venu d'une fusion par ponts (docs/23), dont les lieux prennent d'abord les natures. */
    natures?: {
      depuis?: number;
      types?: {
        [cle: string]: unknown;
      };
    };
  };
  cycle: {
    /** Numéro de cycle, croissant de 1 à chaque tour du moteur. */
    n: number;
    /** Quand le cycle a été calculé (UTC). */
    date: string;
    /** Nombre d'événements de pression intégrés dans ce cycle. */
    pressions_recues?: number;
    saison?: {
      phase: InstantaneUnite;
      nom: "hiver" | "printemps" | "été" | "automne";
      /** Facteur de production des biomes à saisons ce cycle (0,75 en plein hiver, 1,25 en plein été par défaut). */
      production?: number;
    };
  };
  /** Les biomes sont décrits par des axes, pas par des noms : un jeu fait correspondre ses propres biomes aux axes. */
  biomes: {
    id: string;
    nom?: string;
    /** aquatique : l'eau douce (lac, rivière) ; marin : la mer ; amphibie : les deux bords (côte, marais, mangrove), où vivent nageurs et marcheurs. */
    milieu: "terrestre" | "aquatique" | "amphibie" | "aerien" | "souterrain" | "marin";
    /** Chaque axe va de 0 à 1 : 0 = froid/sec/bas/sombre/nu, 1 = chaud/humide/haut/lumineux/dense. Un monde peut en ajouter (catalogue.monde.axes, docs/20). */
    axes: {
      temperature: InstantaneUnite;
      humidite: InstantaneUnite;
      altitude: InstantaneUnite;
      lumiere: InstantaneUnite;
      couvert: InstantaneUnite;
      [cle: string]: InstantaneUnite | undefined;
    };
    /** Capacité d'accueil totale (unités de biomasse abstraites). */
    capacite: number;
    /** Biomes vers lesquels une population peut migrer. */
    voisins?: string[];
    /** Capacité d’origine, vers laquelle le biome regagne lentement après une perte d’habitat. */
    capacite_base?: number;
    /** Amplitudes saisonnières de ce biome (false : aucune, ex. une grotte ou un volcan). Par défaut : température ±0,15, lumière ±0,1, humidité ±0,08, production ±25 %. */
    saisons?: boolean | null | {
      temperature?: number;
      lumiere?: number;
      humidite?: number;
      capacite?: number;
    };
    /** Les axes tels qu’ils sont en cette saison (axes reste la valeur annuelle, stable : c’est elle qu’un traducteur fait correspondre). */
    axes_saison?: {
      [cle: string]: InstantaneUnite;
    };
    /** false : ce biome est à l’abri des catastrophes (incendie, crue, sécheresse). */
    catastrophes?: boolean;
    /** (état interne d'un monde à parcelles, docs/15) le biome dont cette parcelle est une part ; l'instantané publié ne donne que les biomes. */
    type?: string;
    /** Ce que le lieu offre aux machines (docs/16), une fois la Mère éveillée. */
    ressources?: {
      /** ce qu'il y a à capter (une part de l'étendue du biome) */
      surface?: number;
      /** la chaleur de la terre (le volcan, les abysses, la grotte) */
      geothermie?: number;
      /** la lumière de ce cycle (saison, durée du jour, moins ce que le couvert cache) */
      lumiere?: number;
      /** la chaleur de ce cycle (la terre et l'air) */
      chaleur?: number;
      minerai?: number;
      minerai_max?: number;
      /** ce qu'ont laissé les machines mortes ; elle rouille */
      ferraille?: number;
    };
    /** Le milieu transformé (docs/22) : base, les axes du lieu à l'éveil du milieu (axes donne ceux d'aujourd'hui) ; jeu, ce que les joueurs y ont changé, qui s'efface lentement ; etat, ref, signale : la mémoire du moteur. */
    transforme?: {
      [cle: string]: unknown;
    };
    /** (docs/28) Le lieu a changé de nature : le type de lieu qu'il est devenu (type, nom), depuis quand ; inedite : une nature que le monde a inventée. Il en a pris le milieu et les saisons. Absent : il est de sa nature d'origine. */
    nature?: {
      type?: string;
      nom?: string;
      depuis?: number;
      inedite?: boolean;
    };
    /** (docs/31) Les voisins qu'on ne rejoint qu'en traversant la mer (une île née d'un volcan) : seules les bêtes qui volent, nagent ou dérivent (10 g au plus) y passent. */
    traversees?: string[];
    /** (docs/31) Un lieu que le milieu ne transforme pas : ses axes à l'éveil du climat (base), que le climat déplace. */
    climat?: {
      [cle: string]: unknown;
    };
    /** (docs/45) Le temps qu'il fait ici ce cycle, dans un monde à la météo éveillée. Absent : un lieu sans temps (le sous-sol, la mer sans lumière), ou un monde sans météo. Dans un monde par parcelles, c'est le temps moyen des parcelles du biome ; celui de chaque parcelle est dans « parcelles ». */
    meteo?: {
      /** Le temps nommé : clair, couvert, pluie, orage, neige, gel, canicule, tempete, brouillard. D'autres pourront venir : un jeu qui n'en connaît pas un le montre comme « couvert ». */
      temps?: string;
      /** L'écart de chaleur à la saison, en écarts-types (0 : la température de saison ; +1 : un cycle nettement chaud). */
      t?: number;
      /** L'écart d'eau à la saison (0 : un temps de saison ; +1 : un cycle nettement arrosé ; −1 : nettement sec). */
      e?: number;
      /** Le vent : fort là où un front passe. Absent : calme. */
      vent?: number;
      /** Le manteau de neige au sol (1 : épais). Absent : pas de neige. */
      neige?: number;
      /** Le sec qui dure : une moyenne glissante du manque d'eau. Au-dessus de 0,5, une sécheresse est installée. Absent : aucun manque. */
      secheresse?: number;
      /** Les eaux qui montent : une moyenne glissante de la pluie, et la neige qui fond. Plus elles sont hautes, plus une crue est probable. Absent : rien. */
      eaux?: number;
      /** Ce que le temps fait à la production du lieu ce cycle (1 : rien ; il multiplie celle de la saison). De moyenne 1 sur l'année. */
      production?: number;
      /** Un biome d'un monde par parcelles dont les parcelles n'ont pas toutes le même temps : la part de chacun (pesée par la capacité). */
      temps_parts?: {
        [cle: string]: number;
      };
    };
    /** (docs/31) Une île jeune : le cycle de sa naissance (nee) et la capacité qu'elle aura (cible) ; sa terre s'enrichit. */
    jeune?: {
      [cle: string]: unknown;
    };
    /** (docs/28) Un monde par parcelles : la part de ses parcelles qui ont changé de nature, par nature (type, nom, part). */
    natures?: {
      [cle: string]: unknown;
    }[];
    /** (docs/38) Les populations voisines venues hiverner ici (taxon, de : leur lieu, effectif, forme du groupe). Sans hivernage actif, c'est une estimation, et elles restent comptées chez elles ; avec (regles.hivernage.actif), ce sont les hivernants comptés ici (populations[].hivernants). */
    visiteurs?: {
      taxon?: string;
      de?: string;
      effectif?: number;
      forme?: string;
    }[];
  }[];
  /** Les traits cités par les phénotypes de cet instantané, avec ce qu'ils impliquent. Un trait n'est jamais une stat de jeu : c'est un organe, un coût, un effet, un comportement. Les traits y sont dans l’ordre du catalogue du moteur : c’est lui qui dit qui masque qui (docs/9). */
  catalogue: {
    version: string;
    traits: {
      [cle: string]: {
        domaine: "morphologie" | "locomotion" | "sens" | "offense" | "defense" | "metabolisme" | "reproduction" | "social" | "activite";
        /** Ce que le corps porte pour ce trait (glande, carapace, membrane…). */
        organe: string;
        /** Surcoût énergétique relatif par rapport au plan de base (0.15 = +15 %). */
        cout: number;
        /** Ce que le trait permet, en langage biologique (« projette une sécrétion irritante à 3 longueurs de corps »). */
        effet: string;
        /** Conduite induite, si le trait en impose une (« embuscade, riposte à distance »). */
        comportement?: string;
        /** Traits requis pour que celui-ci existe (cohérence des combinaisons). */
        exige?: string[];
        exclut?: string[];
        /** Matières que l'organe laisse derrière lui (pour les traducteurs : objets, récolte). */
        fournit?: string[];
        /** Multiplicateurs appliqués au plan corporel (masse_kg, longevite, portee…). */
        ecarts?: {
          [cle: string]: number;
        };
        /** Valeurs imposées au plan (activite, regime). */
        fixe?: {
          [cle: string]: string;
        };
        /** Multiplicateur de la chance d’être mangé (0.55 = une carapace divise presque par deux). 1 = neutre. */
        vulnerabilite?: number;
        /** Multiplicateur de l’efficacité de chasse (1.25 = crocs allongés). 1 = neutre. */
        chasse?: number;
        /** Multiplicateur de la mortalité par maladie (0.85 résiste ; 1.25 : le groupe propage). 1 = neutre. */
        resistance?: number;
        /** Ce que l'organe fait faire à la bête, en vocabulaire abstrait (docs/7-conduites.md). type : riposte-distance, riposte-contact, defense-contact, repli, protection, immobilite, alerte-groupe, defense-petits, vol-plane, vision-nocturne, perception-proche, vue-diurne-faible, morsure, sprint, lenteur, escalade, nage, avertissement, activite-crepuscule. presage : ce qu'un joueur attentif voit avant qu'elle ne se déclenche. */
        conduite?: {
          type: string;
          effet?: string;
          portee?: number;
          recharge?: number;
          force?: number;
          presage?: string;
        };
        /** Dominant (par défaut) : une copie de l’allèle suffit à montrer le trait. Récessif : il en faut deux ; deux parents qui ne le montrent pas peuvent le transmettre (docs/9). */
        heredite?: "dominant" | "recessif";
        /** Ce que le trait pèse dans le choix du partenaire : 1,6, un porteur a 60 % de chances en plus d’être choisi pour père (docs/9). */
        attrait?: number;
        /** Ce que le trait fait devant les plantes (docs/17) : portee (la hauteur atteinte, en part de la taille), haut (il atteint les arbres), toxique et epineux (la part des défenses qu'il supporte, de 0 à 1). */
        flore?: {
          portee?: number;
          haut?: boolean;
          toxique?: number;
          epineux?: number;
        };
        /** (docs/27) Le nom d'un trait inventé par le monde (des chromatophores dentelés) : un jeu peut le dire tel quel. */
        nom?: string;
        /** (docs/32) Un trait composé par la grammaire : sa phrase (phrase), son moyen (lumiere, son, electricite, odeur, chaleur, couleur), son action, sa cible, son moment, son signe (ce qu'un jeu montre : lueur, eclair, decharge, cri, echo, musc, parfum, thermo, vapeur, couleurs), sa force, sa couleur. */
        grammaire?: {
          [cle: string]: unknown;
        };
        /** (docs/27) Un trait inventé par le monde : la lignée qui l'a inventé, le cycle, les traits dont il vient (de). */
        origine?: {
          lignee?: string;
          cycle?: number;
          de?: string[];
        };
      };
    };
    /** Les traits continus (docs/8) et ce qu’ils modulent : champ du plan, mode (log : × e^(echelle·z) ; lin : + echelle·z), héritabilité de départ, largeur de la sélection stabilisante, pentes de prédation, de fécondité, de maladie, optimum selon un axe du biome. */
    quantitatifs?: {
      [cle: string]: {
        champ: string;
        mode: "log" | "lin";
        echelle: number;
        h2: number;
        omega2?: number;
        predation?: number;
        fecondite?: number;
        maladie?: number;
        optimum?: {
          axe?: string;
          pente?: number;
        };
        effet?: string;
      };
    };
    /** Les types d'organes (moteur/corps.js, docs/11) : places possibles, nombre, formes, fonction, mots pour les décrire, et la conduite qu'un organe prête au jeu (charge, riposte-contact, protection, repli…), forte en proportion de sa taille. Ajouter un type, c'est une entrée ici : ni le schéma ni les jeux ne changent. */
    organes?: {
      [cle: string]: {
        places: Array<"tete" | "dos" | "flancs" | "queue" | "avant">;
        nombre: number[];
        defaut?: number;
        formes: string[];
        fonction: string;
        mot: string[];
        fem?: 0 | 1;
        conduite?: {
          type: string;
          force?: number;
          effet?: string;
          nom?: string;
          presage?: string;
        };
      };
    };
    /** (docs/34) Les savoirs que le monde connaît : pour chacun, son nom, son geste (casser, pecher, encercler, alerter, cacher, laver, migrer, tisser), son outil (pierre, brindille, brindilles), son présage, ce qu'il fait. */
    savoirs?: {
      [cle: string]: {
        [cle: string]: unknown;
      };
    };
    /** Les traits des plantes (docs/17) : toxique, epineux. */
    flore?: {
      [cle: string]: {
        [cle: string]: unknown;
      };
    };
    /** Le catalogue propre du monde (docs/20) : ses axes, ses traits, ses organes, ses formes de corps. Ils s'ajoutent à ceux du moteur, sans les remplacer. Un traducteur y lit ce que le monde a de plus que les autres. */
    monde?: {
      nom?: string;
      /** Les axes de biome propres au monde (la magie, le rayonnement…) : ils comptent dans la niche comme les cinq du moteur. */
      axes?: {
        [cle: string]: {
          nom?: string;
          effet?: string;
        };
      };
      /** Les traits propres au monde, au format de catalogue.traits : ils apparaissent par mutation comme ceux du moteur. */
      traits?: {
        [cle: string]: {
          domaine: "morphologie" | "locomotion" | "sens" | "offense" | "defense" | "metabolisme" | "reproduction" | "social" | "activite";
          /** Ce que le corps porte pour ce trait (glande, carapace, membrane…). */
          organe: string;
          /** Surcoût énergétique relatif par rapport au plan de base (0.15 = +15 %). */
          cout: number;
          /** Ce que le trait permet, en langage biologique (« projette une sécrétion irritante à 3 longueurs de corps »). */
          effet: string;
          /** Conduite induite, si le trait en impose une (« embuscade, riposte à distance »). */
          comportement?: string;
          /** Traits requis pour que celui-ci existe (cohérence des combinaisons). */
          exige?: string[];
          exclut?: string[];
          /** Matières que l'organe laisse derrière lui (pour les traducteurs : objets, récolte). */
          fournit?: string[];
          /** Multiplicateurs appliqués au plan corporel (masse_kg, longevite, portee…). */
          ecarts?: {
            [cle: string]: number;
          };
          /** Valeurs imposées au plan (activite, regime). */
          fixe?: {
            [cle: string]: string;
          };
          /** Multiplicateur de la chance d’être mangé (0.55 = une carapace divise presque par deux). 1 = neutre. */
          vulnerabilite?: number;
          /** Multiplicateur de l’efficacité de chasse (1.25 = crocs allongés). 1 = neutre. */
          chasse?: number;
          /** Multiplicateur de la mortalité par maladie (0.85 résiste ; 1.25 : le groupe propage). 1 = neutre. */
          resistance?: number;
          /** Ce que l'organe fait faire à la bête, en vocabulaire abstrait (docs/7-conduites.md). type : riposte-distance, riposte-contact, defense-contact, repli, protection, immobilite, alerte-groupe, defense-petits, vol-plane, vision-nocturne, perception-proche, vue-diurne-faible, morsure, sprint, lenteur, escalade, nage, avertissement, activite-crepuscule. presage : ce qu'un joueur attentif voit avant qu'elle ne se déclenche. */
          conduite?: {
            type: string;
            effet?: string;
            portee?: number;
            recharge?: number;
            force?: number;
            presage?: string;
          };
          /** Dominant (par défaut) : une copie de l’allèle suffit à montrer le trait. Récessif : il en faut deux ; deux parents qui ne le montrent pas peuvent le transmettre (docs/9). */
          heredite?: "dominant" | "recessif";
          /** Ce que le trait pèse dans le choix du partenaire : 1,6, un porteur a 60 % de chances en plus d’être choisi pour père (docs/9). */
          attrait?: number;
          /** Ce que le trait fait devant les plantes (docs/17) : portee (la hauteur atteinte, en part de la taille), haut (il atteint les arbres), toxique et epineux (la part des défenses qu'il supporte, de 0 à 1). */
          flore?: {
            portee?: number;
            haut?: boolean;
            toxique?: number;
            epineux?: number;
          };
          /** (docs/27) Le nom d'un trait inventé par le monde : un jeu peut le dire tel quel. */
          nom?: string;
          /** (docs/32) Un trait composé par la grammaire : sa phrase, son moyen, son action, sa cible, son moment, son signe, sa force. */
          grammaire?: {
            [cle: string]: unknown;
          };
          /** (docs/27) Un trait inventé par le monde : la lignée qui l'a inventé, le cycle, les traits dont il vient (de). */
          origine?: {
            lignee?: string;
            cycle?: number;
            de?: string[];
          };
        };
      };
      /** Les types d'organes propres au monde, au format de catalogue.organes, avec poids (leur chance d'apparaître, 0,8 par défaut). */
      organes?: {
        [cle: string]: {
          [cle: string]: unknown;
        };
      };
      /** Les formes de corps propres au monde : { nom, pattes, depuis (les formes dont elle peut naître), chance } ; (docs/33) loco (les modes de déplacement dont l'un est requis), masse_max, masse_min, repli (la forme qu'un jeu dessine s'il ne sait pas dessiner celle-ci). */
      formes?: {
        [cle: string]: {
          nom?: string;
          pattes?: number;
          depuis?: string[];
          chance?: number;
          loco?: string[];
          masse_max?: number;
          masse_min?: number;
          repli?: string;
        };
      };
    };
  };
  taxons: {
    /** Stable dans le temps ; un jeu peut l'associer à une entité. */
    id: string;
    /** Nom donné par le moteur (ou gardé si le jeu en a proposé un). */
    nom?: string;
    /** Le nom commun que lui a donné le premier joueur qui l'a décrite (docs/37). Le nom du moteur (nom) reste ; un jeu montre celui qu'il préfère. */
    nom_commun?: string;
    /** Qui a nommé la lignée (docs/37) : le nom public du joueur s'il l'a donné, son jeu, le cycle où le nom a été retenu, la date de la proposition. */
    decrit?: {
      par?: string;
      jeu?: string | null;
      cycle?: number | null;
      date?: string | null;
    };
    /** Taxon dont celui-ci s'est séparé (lignée). */
    parent?: string | null;
    /** Une lignée arrivée d'un autre monde par une fusion (docs/14) : son monde, son identifiant et son cycle d'apparition là-bas. Elle n'a aucun ancêtre dans ce monde-ci, et ne s'hybride avec aucune de ses lignées. */
    origine?: {
      monde: string;
      nom?: string;
      /** Son identifiant dans son monde d'origine (il change si le nom y était déjà pris). */
      id?: string;
      apparu?: number;
      fusion: string;
    };
    /** Cycle d'apparition. Négatif : née pendant la genèse ou le rodage, avant la génération 0 (monde.genese.recale). */
    apparu: number;
    /** Cycle d'extinction, sinon null. Un taxon éteint reste listé 10 cycles. */
    eteint?: number | null;
    statut: "croissance" | "stable" | "declin" | "menace" | "eteint";
    /** Le plan corporel de base, commun à tous les phénotypes. */
    plan: {
      masse_kg: number;
      taille_m: number;
      locomotion: Array<"marche" | "course" | "saut" | "nage" | "vol" | "fouissage" | "reptation" | "grimpe">;
      /** Pour un nageur : l'eau où il vit. douce (ou absent) : lacs, rivières ; salee : la mer ; mixte : les deux, comme les poissons qui remontent les fleuves. Un biome amphibie accueille tous les nageurs. */
      eau?: "douce" | "salee" | "mixte";
      /** « synthetique » : une machine (docs/16), qui ne mange pas et ne se mange pas. « vegetal » : une plante (docs/17), qui pousse et se fait brouter. */
      regime: "herbivore" | "carnivore" | "omnivore" | "detritivore" | "filtreur" | "synthetique" | "vegetal";
      /** En cycles. */
      longevite: number;
      /** Âge de reproduction, en cycles. */
      maturite: number;
      /** Descendants par reproduction (moyenne). */
      portee?: number;
      /** 0 solitaire, 1 grégaire. */
      sociabilite: InstantaneUnite;
      /** 0 fuit toujours, 1 riposte toujours. */
      temperament: InstantaneUnite;
      activite: "diurne" | "nocturne" | "crepusculaire" | "continue";
      /** Vitesse de pointe en longueurs de corps par seconde. */
      vitesse_rel?: number;
      /** Acuité des sens (portée relative). */
      perception?: InstantaneUnite;
      /** Axes du biome idéal (mêmes clés que biomes.axes). Sans niche, tout biome au milieu compatible convient. */
      niche?: {
        [cle: string]: number;
      };
      /** Largeur de la niche : écart-type de la convenance sur la distance entre axes (0.35 par défaut). */
      tolerance?: number;
      /** La silhouette (moteur/corps.js) : des proportions de 0 à 1 et des couleurs, pour qu'un jeu dessine une lignée qu'il n'a jamais vue. Dérive à chaque séparation. Les organes (cornes, massue, aiguillon…) apparaissent, grandissent et se perdent ; les scalaires cornes, crête, ailes, carapace, antennes en sont le résumé (la plus grande taille du type), pour les lecteurs anciens. Facultatif. */
      corps?: {
        /** quadrupede, hexapode, bipede, oiseau, serpent, ou une forme propre au monde (catalogue.monde.formes, docs/20). */
        forme?: string;
        /** 0, 2, 4, 6 ou 8 pour les cinq formes de base ; un corps segmenté porte de 10 à 40 pattes (60 au plus), un corps rayonné ou à tentacules de 4 à 10 bras (docs/33). */
        pattes?: number;
        long?: number;
        haut?: number;
        cou?: number;
        tete?: number;
        museau?: number;
        oreilles?: number;
        queue?: number;
        cornes?: number;
        crete?: number;
        ailes?: number;
        carapace?: number;
        antennes?: number;
        /** Les organes de la silhouette (docs/11). Chaque type se pose à une place (tête, dos, flancs, queue, avant) ; sa taille va de 0,2 à 1 ; un organe qui passe sous 0,2 se perd. Ce qu'il fait au jeu (charger, piquer, amortir) est dans ORGANES_CAT. */
        organes?: {
          /** Un type du catalogue (catalogue.organes) ; un lecteur qui ne le connaît pas l'ignore. */
          type: string;
          place?: "tete" | "dos" | "flancs" | "queue" | "avant";
          taille: number;
          nombre?: number;
          /** Une des formes que le catalogue donne à ce type. */
          forme?: string;
        }[];
        motif?: "uni" | "rayures" | "taches" | "bandes" | "masque";
        couleurs?: {
          robe?: number[];
          sombre?: number[];
          ventre?: number[];
          oeil?: number[];
        };
        /** (docs/24) La posture : 0 à quatre pattes ou au ras du sol, 0,5 se dresse, 1 debout (un bipède, un oiseau). */
        posture?: number;
      };
      /** Une machine (regime « synthetique », docs/16) : le niveau de chacun de ses modules, de 0 à 1. panneau, thermique : ce qu'elle capte de la lumière, de la chaleur ; batterie : ce qui la tient sans énergie ; foreuse, recycleur : sa matière, du minerai, de la ferraille ; pince : ce qu'elle prélève des espèces qui débordent ; blindage : ce qui la protège et la fait se réparer ; arme : ce qui la fait riposter ; discretion : ce qui la fait passer inaperçue. */
      modules?: {
        [cle: string]: number;
      };
      /** Une machine (docs/16) : ce qu'elle fait d'abord, d'après ses modules. */
      role?: "regulateur" | "foreuse" | "recycleur" | "capteur";
      /** La famille de la lignée, si elle n'est pas animale (docs/16, docs/17). Un jeu ne reçoit que les familles qu'il demande (Tampon.filtrer). */
      famille?: "animale" | "synthetique" | "vegetale";
      /** Une plante (docs/17) : sa forme, qui dit qui l'atteint. */
      forme?: "herbe" | "buisson" | "arbre" | "roseau" | "algue" | "lichen" | "succulente" | "champignon";
      /** Une plante : sa hauteur. */
      hauteur_m?: number;
      /** (docs/46) Un arbre ou un buisson, dans un monde où les plantes ont leurs saisons : caduc (il perd ses feuilles l'hiver) ou persistant. */
      feuillage?: string;
      /** Une plante : sa repousse par cycle, quand elle a de la place. */
      croissance?: number;
      /** (docs/25) La lignée pond des œufs (ovipare) ou met bas des petits (vivipare), dans un monde où la ponte est éveillée. */
      reproduction?: "ovipare" | "vivipare";
      /** (docs/25) Le mode de sa lignée à l'éveil de la ponte : ce à quoi ses naissances se rapportent. */
      reproduction0?: "ovipare" | "vivipare";
      /** (docs/33) Une lignée qui vit en colonie : ses castes (reine, ouvrieres, soldats : leur masse relative, leur part ; la reine a des ailes ; essaim : la colonie essaime en volant) et la part de la lignée qui vit en colonie (part). */
      castes?: {
        [cle: string]: unknown;
      };
      /** (docs/30) Le spectre de son régime : la part de feuilles, fruits, graines, nectar, insectes, viande et sang dans ce qu'elle mange (leur somme fait 1). Le régime (regime) s'y lit : 10 % de chair au plus, herbivore ; 90 % au moins, carnivore. */
      diete?: {
        [cle: string]: number;
      };
      /** (docs/30) Le spectre de sa lignée à l'éveil des régimes : ce à quoi se rapporte ce que le spectre change. */
      diete0?: {
        [cle: string]: number;
      };
      /** (docs/26) Les deux vies d'une lignée dont une part se métamorphose : la larve (une chenille, un têtard, une larve) et l'adulte, chacun avec son régime et sa façon de se déplacer ; part : la part de la lignée qui se métamorphose ; larves : la part des bêtes qui sont des larves, à un moment donné. */
      stades?: {
        larve?: {
          nom?: string;
          regime?: string;
          locomotion?: string[];
          forme?: string;
          masse_rel?: number;
          eau?: string;
        };
        adulte?: {
          nom?: string;
          regime?: string;
          locomotion?: string[];
          forme?: string;
          masse_rel?: number;
          eau?: string;
        };
        part?: number;
        larves?: number;
      };
    };
    /** Ses populations, une par biome où elle vit. Vide pour une lignée éteinte, qui reste listée 10 cycles ; une lignée vivante en a au moins une (outils/verifier.js le vérifie). */
    populations: {
      biome: string;
      effectif: number;
      /** Variation relative sur le cycle (−0.12 = −12 %). */
      tendance: number;
      /** Part de la mortalité du cycle due aux pressions externes (joueurs). */
      pression?: InstantaneUnite;
      /** Cycle d’installation dans ce biome (sert à la séparation des lignées). */
      depuis?: number;
      /** Part de la mortalité du cycle due aux prédateurs. */
      predation?: InstantaneUnite;
      /** Prédateurs et omnivores : à quel point les proies suffisent (0 = famine, 1 = rassasié). Un traducteur peut en faire l’agressivité. */
      satiete?: InstantaneUnite;
      /** Une épidémie en cours dans cette population. */
      maladie?: {
        /** Cycles avant que l’épidémie ne s’éteigne. */
        reste: number;
        /** Mortalité supplémentaire par cycle, avant résistance et entassement. */
        virulence: number;
        /** Part de la mortalité du cycle due à la maladie. */
        part?: InstantaneUnite;
      };
      /** Les traits continus de cette population (docs/8) : pour chacun, la moyenne m, la variance phénotypique v et la variance additive g, en écarts-types naturels de la génération 0 (z = 1 : un écart-type au-dessus de la moyenne d’alors). Un jeu tire chaque bête dans N(m, v) ; l’héritabilité est g / v. Ce que vaut un écart-type sur le plan : catalogue.quantitatifs. */
      quant?: {
        [cle: string]: {
          m: number;
          v: number;
          g: number;
        };
      };
      /** La reproduction sexuée (docs/9) : pour chaque trait, la fréquence de l’allèle qui le porte dans cette population. Une bête en a deux copies ; un trait dominant se voit chez une part 1 − (1 − p)² des bêtes, un récessif chez p². Un allèle récessif peut donc être bien plus répandu que le trait ne se voit. */
      alleles?: {
        [cle: string]: number;
      };
      /** Le flux de gènes reçu : la part d’immigrants par cycle, en moyenne glissante (docs/10). Près de 0, la population est isolée. */
      flux?: InstantaneUnite;
      /** L’écart génétique de cette population au reste de l’espèce : le F_ST de leurs allèles, plus le quart de l’écart moyen des traits continus (docs/10). Au-delà de REGLES.separation.divergence, une population isolée peut devenir une lignée. */
      divergence?: number;
      /** Une zone hybride (docs/10) : une lignée apparentée vit dans le même biome et s’y croise. */
      hybride?: {
        /** La lignée avec laquelle elle se croise le plus. */
        avec: string;
        /** La part des naissances de cette population qui a un père de l’autre lignée et survit. */
        part: InstantaneUnite;
        /** L’isolement reproductif entre les deux (0 : une seule population ; 1 : aucun croisement). */
        isolement: InstantaneUnite;
      };
      /** Ce que la population a appris des joueurs (docs/12) : la méfiance, nourrie des contacts qui finissent mal (prélèvements, captures), retombe de moitié en 6 cycles. Absente : 0. */
      mefiance?: number;
      /** L'habituation, nourrie des rencontres sans suite et de l'aide (nourrissage, libération), défaite par ce qui finit mal, retombe de moitié en 15 cycles. Absente : 0. */
      habituation?: number;
      /** (monde à parcelles, docs/15) l'effectif de la population dans chacune des parcelles de son biome. */
      parcelles?: {
        [cle: string]: number;
      };
      /** Une machine (docs/16) : ce qu'elle capte rapporté à ce qu'elle dépense ce cycle ; sous 1, elle est en veille et ne s'assemble plus. */
      energie?: number;
      /** Une machine (docs/16) : ce qu'elle fait face aux joueurs, d'après sa méfiance (docs/12) et son arme. neutre : elle les ignore ; defensive : elle se tient à distance et riposte si on l'attaque ; fuyante : méfiante et sans arme, elle fuit ; hostile : méfiante et armée, elle attaque. */
      posture?: "neutre" | "defensive" | "fuyante" | "hostile";
      /** La part des morts de la population dues aux machines régulatrices (docs/16). */
      regulation?: number;
      /** Un brouteur (docs/17) : ce qu'il trouve à brouter ici, rapporté à ce qu'il trouvait à l'éveil de la flore ; absent quand il n'a pas changé. */
      nourriture?: number;
      /** Une plante : la place qu'elle a ici (en unités de capacité). */
      potentiel?: number;
      /** Une plante : la fréquence de chacun de ses phénotypes ici, dans l'ordre de ses phenotypes. */
      frequences?: number[];
      /** Une plante : ce qu'elle était à l'éveil de la flore (effectif, frequences) ; la nourriture des brouteurs s'y rapporte. */
      reference?: {
        [cle: string]: unknown;
      };
      /** Un brouteur (docs/17) : ce qu'il mangeait en commun avec sa bande de taille à son arrivée ; la place qu'il trouve s'y rapporte. */
      recouvrement?: number;
      /** Les souches qui circulent dans la population (docs/18) : pour chacune, la part des bêtes infectées (i) et celle des immunisées (r). */
      infection?: {
        [cle: string]: {
          i?: number;
          r?: number;
        };
      };
      /** (docs/47) Une plante qu'une catastrophe vient de toucher, dans un monde à la succession éveillée : laquelle (type : incendie, crue, secheresse), à quel cycle, et la part de ses pieds qu'elle y a perdue. Elle le dit douze cycles. */
      sinistre?: {
        type?: string;
        cycle?: number;
        part?: number;
      };
      /** (docs/46) Une plante, dans un monde où les plantes ont leurs saisons : où elle en est ce cycle. nu, bourgeons, fleurs, feuilles, fruits, graines, feuilles_tombent, seche, sous_la_neige, brule (elle vient de brûler, docs/47). D'autres pourront venir : un jeu qui n'en connaît pas un la montre « feuilles ». */
      stade?: string;
      /** (docs/46) Une plante : la part de son feuillage qui est là ce cycle (1 : tout ; 0 : un arbre nu). */
      feuillage?: number;
      /** Une plante à fleurs (docs/18) : ce que les butineurs du lieu faisaient à son arrivée ; sa repousse s'y rapporte. */
      pollinisation?: number;
      /** Une plante à fruits (docs/30) : ce que les mangeurs de fruits du lieu faisaient à son arrivée ; sa repousse s'y rapporte. */
      dispersion?: number;
      /** Une plante (docs/30) : ce qu'elle était à l'éveil des régimes en spectre (effectif, frequences). */
      reference_diete?: {
        [cle: string]: unknown;
      };
      /** (docs/34) Ce que sait la population : pour chaque savoir (catalogue.savoirs), la part de ses bêtes qui le savent. Une tradition : une autre population de la même lignée peut ne pas le savoir. */
      savoirs?: {
        [cle: string]: number;
      };
      /** (docs/38) Comment vivent ses bêtes : seules, en famille, en troupeau, en bande, en meute, en banc, en volée, en essaim, en colonie ; la taille d'un groupe ; sa hiérarchie, qui le mène, ses sentinelles, sa chasse, les lignées qui paissent avec elle. Une lecture de l'état : elle ne change rien à la simulation. */
      groupe?: {
        forme: "solitaire" | "famille" | "troupeau" | "bande" | "meute" | "banc" | "volee" | "essaim" | "colonie";
        nom?: string;
        sociabilite?: number;
        taille: {
          min?: number;
          typ?: number;
          max?: number;
        };
        hierarchie?: {
          niveau?: number;
          type?: "egalitaire" | "dominance" | "despotique" | "castes";
        };
        meneur?: string | null;
        sentinelles?: boolean;
        chasse?: "ensemble" | "encercle";
        /** Des lignées qui paissent avec elle (un troupeau mêlé). */
        avec?: string[];
      };
      /** (docs/38) Une population qui migre avec les saisons : le lieu voisin où elle hiverne, la part qui part, les phases de l'année du départ et du retour (0 : le cœur de l'hiver), l'état du moment. Ses bêtes restent comptées ici : un jeu qui en prend une là-bas la renvoie avec ce lieu-ci. */
      migration?: {
        vers?: string;
        vers_nom?: string;
        saison?: string;
        part?: number;
        depart?: number;
        retour?: number;
        etat?: "au depart" | "partie" | "au retour" | "au pays";
        guide?: string;
      };
      /** (docs/38) Dans un monde où l'hivernage est actif (regles.hivernage.actif), la part de cette population venue d'ailleurs passer l'hiver ici, par lieu d'origine : ils sont comptés dans son effectif, et rentrent chez eux au printemps. */
      hivernants?: {
        [cle: string]: number;
      };
      /** Un brouteur (docs/30) : sa référence d'avant l'éveil des régimes, le temps de la raccorder (un cycle). */
      recouvrement_avant?: number;
    }[];
    /** Combinaisons cohérentes de traits, avec leur fréquence dans le taxon. Les fréquences somment à 1. Le premier est le phénotype de base. */
    phenotypes: {
      id: string;
      frequence: InstantaneUnite;
      frequence_par_biome?: {
        [cle: string]: InstantaneUnite;
      };
      /** Identifiants du catalogue. Vide pour le phénotype de base. */
      traits: string[];
      /** Somme des coûts : ce que ce phénotype paie en énergie. */
      cout_total?: number;
      /** Ce que le phénotype change au plan (multiplicateurs). */
      ecarts?: {
        [cle: string]: number;
      };
      /** Avantage sélectif net du cycle (positif : la fréquence monte). */
      selection?: number;
    }[];
  }[];
  /** Ce qui s'est passé de notable dans le cycle : lisible par le visualiseur et par un jeu qui veut le raconter. */
  evenements?: {
    type: "apparition" | "extinction" | "separation" | "migration" | "effondrement" | "explosion" | "nouveau_trait" | "epidemie" | "remission" | "catastrophe" | "hybridation" | "mefiance" | "eveil" | "conception" | "transfert" | "transformation" | "invention" | "nature" | "climat" | "meteo" | "savoir";
    taxon: string;
    biome?: string;
    detail?: string;
  }[];
  /** Le cycle d'avant, allégé (effectifs par biome, fréquences des phénotypes), joint à l'instantané publié : tous les traducteurs interpolent entre les deux de la même façon. */
  precedent?: {
    cycle?: number;
    taxons?: {
      id: string;
      populations?: unknown[];
      phenotypes?: unknown[];
    }[];
  };
  /** Les parcelles du monde (docs/15), s'il en a : leur biome (type), leur capacité, leurs voisines. Les populations des taxons sont données par biome, avec leur répartition par parcelle. */
  parcelles?: {
    id: string;
    /** Le biome dont la parcelle est une part. */
    type: string;
    nom?: string;
    capacite?: number;
    voisins?: string[];
    /** (docs/45) Le temps qu'il fait dans cette parcelle ce cycle : les mêmes champs que biomes[].meteo (temps, t, e, vent, neige, secheresse, eaux, production). */
    meteo?: {
      [cle: string]: unknown;
    };
  }[];
}

/** Orvane — lot de pressions (entrée, envoyé par le traducteur) — Ce qu'un jeu renvoie à Orvane : des comptes bruts, jamais des conclusions. Le tampon rapporte ces comptes à l'exposition (rencontres), les dénormalise selon la rareté affichée par le jeu et les plafonne avant de les donner au moteur. */
export interface Lot {
  /** Version du contrat que suit le lot, MAJEUR.MINEUR (« 1.0 » ; docs/43). Orvane accepte les lots des versions 0.x et 1.x. */
  orvane: string;
  /** Doit être l'id du monde de l'instantané lu. */
  monde: string;
  /** Les familles de lignées que ce jeu joue (animale seule si rien n'est dit, ni ici ni dans son exposition). Le tampon ne lit pas ses événements sur les autres : une nouveauté du monde (les machines, docs/16) ne compte pour un jeu que s'il la demande. */
  familles?: Array<"animale" | "synthetique" | "vegetale">;
  /** Numéro du cycle que le jeu utilisait quand ces événements ont eu lieu (sert à dénormaliser avec les bonnes fréquences). */
  instantane?: number;
  source: {
    jeu: string;
    /** Identifiant opaque du joueur (hash) : sert aux plafonds par compte, jamais stocké en clair. */
    compte: string;
    /** Identifiant opaque de la zone de jeu (île, carte, serveur) : sert à la répartition géographique des pressions. */
    zone?: string;
  };
  periode: {
    debut: string;
    fin: string;
  };
  evenements: {
    taxon?: string;
    /** Facultatif, dans un monde à parcelles (docs/15) : la parcelle où l'événement a eu lieu, une parcelle de son biome (« prairie~2 »). La pression y est posée ; sans elle, elle est répartie selon les effectifs. */
    parcelle?: string;
    /** Omis si le jeu ne distingue pas les phénotypes pour cette action. */
    phenotype?: string;
    /** Biome Orvane (déjà traduit par le traducteur, pas le biome du jeu). */
    biome: string;
    /** rencontre : vu/approché, sans conséquence (mesure l'exposition). prelevement : mort causée par le joueur. capture : retiré du sauvage (apprivoisé). liberation : rendu au sauvage. nourrissage/reproduction : aide à la population. deplacement : emporté vers un autre biome (voir « vers »). defrichage, reboisement, assechement, irrigation, construction, transformation : le jeu change le milieu, en « n » unités de surface (docs/22) ; construction retire aussi de l'habitat ; transformation dit son axe et son sens. Ces actions, comme habitat_*, n'ont pas de taxon. habitat_* : surface d'habitat détruite/créée, en « n » unités. */
    action: "rencontre" | "prelevement" | "capture" | "liberation" | "nourrissage" | "reproduction" | "deplacement" | "habitat_perdu" | "habitat_gagne" | "defrichage" | "reboisement" | "assechement" | "irrigation" | "construction" | "transformation";
    /** Compte brut sur la période : un nombre fini, de 0 à 10 000. Un événement hors de ces bornes, ou dont la lignée, le lieu, l'action ou la destination sont inconnus du monde, est écarté par le tampon (compté dans « rejetes ») ; le reste du lot est lu. */
    n: number;
    /** Biome de destination pour « deplacement ». */
    vers?: string;
    /** (docs/22) Pour « transformation » : l'axe du lieu que le jeu change (couvert, humidite, temperature… ou un axe du monde, catalogue.monde.axes). */
    axe?: string;
    /** (docs/22) Pour « transformation » : 1, l'axe monte ; −1, il baisse. */
    sens?: number;
    /** Si le jeu le sait : prélever des adultes reproducteurs pèse plus ; un œuf pris pèse moins qu'un jeune (docs/25). */
    age?: "oeuf" | "jeune" | "adulte" | "vieux";
    /** Traits continus (docs/8) : la valeur moyenne z des bêtes de cet événement, telle qu'elles l'ont tirée à la naissance. C'est ce qui dit à Orvane si les joueurs prennent les plus grandes, les plus audacieuses… */
    q?: {
      [cle: string]: number;
    };
    /** Avec « liberation » (docs/36) : les bêtes relâchées sont nées en élevage, et le jeu connaît leur génome (OrvaneIndividus.genome) : elles rejoignent la population avec leurs gènes. */
    genome?: {
      n?: number;
      /** la fréquence de chaque allèle parmi elles */
      alleles?: {
        [cle: string]: number;
      };
      /** leur valeur génétique moyenne, par trait continu */
      a?: {
        [cle: string]: number;
      };
    };
  }[];
}

/** Orvane — profil d'un monde (réglage du tampon) — Un fichier par monde. Il règle le tampon dans le sens jeu → Orvane : comment les actes des joueurs de tous les jeux branchés pèsent sur le monde. Ce que chaque jeu montre du monde (exposition) est réglé par le jeu lui-même dans le Supabase d'Orvane (orvane_regler_jeu, hebergement/LISEZ-MOI.md) et publié dans jeux.json ; l'exposition d'un profil de monde ne sert plus qu'aux lots sans jeu (et aux mondes d'avant, comme sv-1). Rien ici ne touche à la biologie elle-même. */
export interface Profil {
  /** Version du contrat que suit le profil, MAJEUR.MINEUR (« 1.0 » ; docs/43). Orvane accepte les profils des versions 0.x et 1.x. */
  orvane: string;
  /** Le jeu pour lequel le monde a été fait (mondes d'avant, comme sv-1). Un monde universel n'en a pas. */
  jeu?: string;
  monde: {
    id: string;
    graine: number;
    /** Durée réelle d'un cycle : « 24h », « 6h », « 1h », « 30min », « 7d » (docs/19). Le workflow passe chaque heure et ne fait tourner le monde qu'à ses heures de cycle (monde.heure, cycle.js --auto). */
    cycle: string;
    /** L'heure de cycle, en UTC (« 03:00 » par défaut) : les heures de cycle en partent et reviennent toutes les monde.cycle (docs/19). */
    heure?: string;
    /** Chemin du catalogue propre du monde (axes, traits, organes, formes de corps), relu à chaque cycle (docs/20). */
    catalogue?: string;
    /** Combien de cycles dus le monde rattrape d'un coup, au plus, après une absence (3 par défaut, docs/19). */
    rattrapage?: number;
    /** Chemin du fichier décrivant les biomes du monde (axes, capacités, voisins) ; sinon les biomes par défaut d'Orvane. */
    biomes?: string;
    /** Chemin d'un instantané de départ (génération 0) si le jeu part d'un bestiaire existant. */
    amorce?: string;
    /** Les fusions que le cycle de nuit doit appliquer à ce monde (docs/14) : chacune une seule fois, avant le cycle ; l'état en garde la trace (monde.fusions de l'instantané). */
    fusions?: {
      /** Le nom de la fusion : une fusion faite ne se refait pas. */
      id: string;
      /** Le monde qui arrive : un instantané ou une amorce, chemin depuis la racine du dépôt (ex. mondes/marin/amorce.json). */
      source: string;
      /** Les biomes où ses lignées arrivent (par défaut, tous ceux que les deux mondes partagent). */
      biomes?: string[];
      /** La part de ses effectifs qui arrive (0,5 par défaut ; 1 pour une fusion par ponts). */
      part?: number;
      /** (docs/23) Le nom du continent, dans les noms de ses parcelles et au journal (celui de la source, sinon). */
      nom?: string;
      /** (docs/23) Une fusion par ponts : la source devient un continent du monde, relié par autant de ponts (un nombre), ou par ceux-là ([[biome de la source, biome de la cible], …]). */
      ponts?: number | string[][];
    }[];
    /** Les souches (docs/18) : le cycle de nuit donne au monde ses souches, une fois ; les épidémies sont désormais les leurs. */
    pathogenes?: boolean;
    /** La flore (docs/17) : le cycle de nuit éveille la flore, une fois : une lignée de plantes par forme et par biome, à l'équilibre avec les brouteurs du moment. */
    flore?: boolean;
    /** Le milieu transformé (docs/22) : le cycle de nuit l'éveille, une fois ; les brouteurs, les fouisseurs, les bâtisseurs et les joueurs changent désormais les lieux. */
    milieu?: boolean;
    /** Pondre ou mettre bas (docs/25) : le cycle de nuit donne à chaque lignée son mode, une fois. */
    ponte?: boolean;
    /** Les cycles de vie (docs/26) : le cycle de nuit les éveille, une fois ; la métamorphose peut alors naître par mutation. */
    stades?: boolean;
    /** Un monde inventif (docs/27) : le cycle de nuit l'éveille, une fois ; ses lignées peuvent inventer des traits que personne n'a décrits. */
    invention?: boolean;
    /** L'esprit (docs/34) : le cycle de nuit l'éveille, une fois ; les bêtes apprennent, transmettent, se servent d'outils ; chaque population a ses savoirs. */
    esprit?: boolean;
    /** (docs/41) Le genre du jeu qui fait vivre ce monde : ses règles du moteur (moteur/genres.js) passent sur celles de la genèse, celles de monde.regles par-dessus ; ses poids des joueurs passent dans l'influence. « neutre » : le moteur tel qu'il est. */
    genre?: "neutre" | "horreur" | "cozy" | "collection" | "voxel" | "survie" | "strategie" | "mmo";
    /** Des règles du moteur (REGLES de moteur/orvane.js) réglées pour ce monde vivant : elles complètent, d'un niveau, celles de sa genèse (monde.regles de l'instantané) et ne valent que pour ce qui arrive ensuite. Exemple : { "derive": { "tolerance": 0.35, "formes": 1 } } laisse la largeur de la niche dériver à la séparation, et fait naître les formes nouvelles du monde à la séparation (docs/33). ; { "hivernage": { "actif": 1, "rude": 0.85 } } fait partir pour de bon les bêtes dont l'hiver est rude (docs/38). */
    regles?: {
      [cle: string]: unknown;
    };
    /** Faire renaître le monde (hebergement/publication.js) : une date, par exemple « 2026-11-06 ». Quand elle change, la passe suivante de l'action repart de l'état que porte main (supprimé, pour un monde neuf) au lieu de celui de la branche publication. */
    renaitre?: string;
    /** La vie en groupe (docs/38) : le monde publie, pour chaque population, son groupe (troupeau, meute, banc…), sa hiérarchie et ses migrations saisonnières. Une lecture de l'état : rien ne change dans la simulation. */
    collectif?: boolean;
    /** Les castes (docs/33) : le cycle de nuit les éveille, une fois ; de petits hexapodes grégaires peuvent devenir des colonies (une reine, des ouvrières, des soldats). */
    castes?: boolean;
    /** Les formes nouvelles (docs/33) : le cycle de nuit les éveille, une fois ; un corps segmenté, rayonné ou à tentacules peut naître. */
    formes?: boolean;
    /** La grammaire des effets et des conduites (docs/32) : le cycle de nuit l'éveille, une fois ; le monde compose des traits d'un genre neuf (une lueur qui attire, une décharge qui foudroie, un cri qui alerte, une odeur qui repousse). */
    grammaire?: boolean;
    /** Les plantes subissent et transforment (docs/47) : le cycle de nuit l'éveille, une fois, dans un monde qui a une flore ; le feu, la crue et le sec prennent des pieds aux plantes, l'herbe puis les buissons reprennent la place des arbres disparus, et le couvert d'un lieu suit ses arbres (avec le milieu, docs/22). */
    succession?: boolean;
    /** Les saisons des plantes (docs/46) : le cycle de nuit les éveille, une fois, dans un monde qui a une flore et une année ; les arbres caducs perdent leurs feuilles, la pousse suit la belle saison et le temps qu'il fait, le nectar, les fruits et les graines ont leur saison. */
    phenologie?: boolean;
    /** La météo (docs/45) : le cycle de nuit l'éveille, une fois ; chaque lieu (chaque parcelle d'un monde par parcelles) a son temps du cycle, la pluie, la neige, le gel, les orages, les canicules, qui déplace la température, l'humidité et la production de la saison. */
    meteo?: boolean;
    /** Le climat et la géologie lente (docs/31) : le cycle de nuit l'éveille, une fois ; le monde se réchauffe et se refroidit de lui-même, la mer monte et baisse, des volcans font des îles. */
    climat?: boolean;
    /** Les régimes en spectre (docs/30) : le cycle de nuit les éveille, une fois, après la flore ; chaque lignée mange des feuilles, des fruits, des graines, du nectar, des insectes, de la viande ou du sang, en parts qui lui sont propres. */
    dietes?: boolean;
    /** Les dérives (docs/29) : le cycle de nuit les éveille, une fois ; les régimes changent à la séparation, les plantes se séparent, les souches mutent, les insectes les portent. */
    derives?: boolean;
    /** Les lieux qui changent de nature (docs/28) : le cycle de nuit l'éveille, une fois, dans un monde au milieu transformé ; un lieu dont les axes ressemblent à un autre type de lieu en prend la nature. */
    natures?: boolean;
    /** La vie synthétique (docs/16) : le cycle de nuit éveille la Mère, une fois, dans le biome dit (le volcan par défaut). true : avec ses réglages par défaut. */
    synthetique?: boolean | {
      biome?: string;
      nom?: string;
      effectif?: number;
    };
    /** Faire tourner ce monde par parcelles (docs/15) : au prochain cycle, chaque biome est découpé en « par » parcelles voisines, une fois pour toutes. */
    parcelles?: {
      /** Le nombre de parcelles par biome (4 par défaut), ou par biome ({ "prairie": 6 }). */
      par?: number | {
        [cle: string]: unknown;
      };
      /** La graine du découpage (celle du monde par défaut). */
      graine?: number;
    };
    /** Au premier cycle, le monde tourne seul autant de cycles avant d’être publié : la génération 0 est alors un équilibre, pas une amorce brute. */
    rodage?: number;
    /** Durée de l’année en cycles (120 : quatre saisons de 30 jours avec un cycle de 24 h). 0 : pas de saisons. Recopié dans monde.annee de l’instantané à chaque cycle. */
    annee?: number;
    /** Combien de cycles allégés garder dans historique.json (365 par défaut). */
    historique?: number;
    /** false : le cycle nocturne passe ce monde (hebergement/cycle.js --forcer pour le faire tourner quand même). */
    nocturne?: boolean;
    /** Où l'action nocturne lit les lots de pressions de ce monde : le Supabase d'Orvane (url), sa clé PUBLIQUE (cle), la fonction de lecture des lots (orvane_lire_lots), celle des jeux (jeux : orvane_lire_jeux) et le NOM de la variable d'environnement qui porte le secret de lecture d'Orvane. Le secret lui-même n'est jamais dans le profil. */
    pressions?: {
      url: string;
      cle: string;
      fonction?: string;
      secret?: string;
      /** La fonction qui liste les jeux et leur exposition (orvane_lire_jeux). Sans elle, les lots sont lus avec l'exposition du profil. */
      jeux?: string;
      /** La fonction qui lit les noms proposés par les joueurs (orvane_lire_noms, docs/37). Sans elle, seuls les noms du dossier noms/ du monde comptent. */
      noms?: string;
    };
  };
  /** Sens Orvane → jeu. Le même objet est l'exposition d'un jeu, envoyée par orvane_regler_jeu. */
  exposition?: {
    /** Les familles de lignées que ce jeu sait jouer (animale seule par défaut). Il ne reçoit pas les autres (Tampon.filtrer), et le tampon ne lit pas ses événements sur elles : une nouveauté du monde n'arrive chez un jeu que s'il la demande. */
    familles?: Array<"animale" | "synthetique" | "vegetale">;
    /** Facteur k appliqué à la COTE d’un phénotype (f/(1−f)) avant exposition : avec k = 0,1, 20 % dans Orvane devient 2,4 % dans le jeu, mais 99 % reste 91 % (une variante devenue majoritaire l’est aussi dans le jeu). Le phénotype de base absorbe le reste. */
    compression: {
      defaut: number;
      par_domaine?: {
        [cle: string]: number;
      };
      par_trait?: {
        [cle: string]: number;
      };
      par_biome?: {
        [cle: string]: number;
      };
    };
    /** Un changement de fréquence dans Orvane est étalé sur autant de cycles côté jeu (interpolation linéaire entre instantanés). */
    propagation_cycles: number;
    /** Variation maximale d'une fréquence exposée par cycle (0.05 = 5 points). */
    inertie_max?: number;
    /** Traits que le jeu sait représenter. Les autres sont masqués : leurs phénotypes sont fusionnés avec le phénotype de base à l'exposition (ils continuent d'évoluer dans Orvane). */
    traits_rendus?: string[];
    /** Effectif Orvane sous lequel le jeu cesse de faire apparaître le taxon (avant l'extinction réelle). */
    seuil_extinction_jeu?: number;
    /** Un taxon éteint peut-il revenir par recolonisation d'un biome voisin ? */
    retour_apres_extinction?: boolean;
    /** compression : la fréquence réelle d'un phénotype passe par la compression (sur la cote). relatif : le jeu garde ses propres taux (taux_jeu) à la génération 0, et ne suit que l'ÉCART d'Orvane depuis elle — une variante deux fois plus répandue qu'à la génération 0 l'est deux fois plus dans le jeu (sur la cote). Le jour un, le jeu est exactement ce qu'il était. */
    mode?: "compression" | "relatif";
    /** Mode relatif : par trait rendu, la chance qu'avait une naissance de le porter avant Orvane. Un phénotype à plusieurs traits rendus : le produit. */
    taux_jeu?: {
      [cle: string]: number;
    };
    /** Mode relatif : la fréquence de référence plancher, pour une combinaison absente de la génération 0 (elle n'apparaît dans le jeu qu'une fois installée). */
    reference_min?: number;
    /** Une espèce disparaît du jeu sur une île quand son effectif sur les sols de l'île tombe sous seuil_extinction_jeu ET sous cette part de ce qu'il était à la génération 0 : une espèce rare dès le départ n'est pas rayée pour autant. */
    seuil_extinction_part?: number;
    /** Mode relatif : un phénotype dont aucun trait n'est rendu garde sa fréquence réelle (reel) — le jeu peut faire agir ses traits (docs/7-conduites.md) — ou se fond dans le plan de base (base). */
    non_rendus?: "reel" | "base";
    /** Les traits continus (docs/8) que le jeu montre, et combien de leur variation naturelle. */
    quantitatifs?: {
      /** Les traits continus que le jeu sait jouer (taille, vitesse, audace, sociabilite) : il en tire une valeur par bête et la rapporte. */
      rendus?: string[];
      /** Part de la variation individuelle montrée. 0 : toutes les bêtes d’une population ont l’allure de sa moyenne (seul l’écart depuis la génération 0 se voit ; le jour un ne change rien). 1 : toute la variation naturelle. */
      variation?: number;
    };
    /** La méfiance et l'habituation (docs/12) : comment le jeu rend ce qu'une population a appris des joueurs. La distance de fuite est multipliée par fuite^méfiance × habitude^habituation. */
    mefiance?: {
      /** false : le jeu ne le montre pas (Orvane le tient quand même). */
      rendue?: boolean;
      /** Le facteur de la distance de fuite à méfiance 1 (2,2 par défaut). */
      fuite?: number;
      /** Le facteur à habituation 1 (0,5 par défaut). */
      habitude?: number;
    };
    /** Qui peuple les îles : « jeu » (par défaut) — la faune du jeu, suivie par Orvane, et les lignées qui en descendent ; « orvane » — la faune du jeu qu'Orvane ne simule pas dans ce monde (un monde né de la genèse) cède sa place aux lignées du monde, régime par régime, autant de bêtes qu'avant (traducteur de Stone Valley, §217). */
    bestiaire?: "jeu" | "orvane";
  };
  /** Sens jeu → Orvane. */
  influence: {
    /** Poids d'une unité de chaque action, après dénormalisation, en individus équivalents retirés : 1 prélèvement = 1 ; négatif = favorable à la population (libération, nourrissage, habitat gagné). */
    poids: {
      [cle: string]: number;
    };
    /** Rapporter les comptes à la fréquence exposée (une variante montrée à 2 % mais réelle à 20 % voit ses pertes multipliées par 10). Recommandé : true. */
    denormaliser?: boolean;
    /** Nombre de rencontres par compte et par cycle considéré comme activité normale ; au-delà, la pression d'un compte est ramenée à ce niveau. */
    exposition_ref?: number;
    plafonds: {
      /** Pression maximale qu'un seul compte peut exercer sur un taxon par cycle (en individus équivalents). */
      par_compte_cycle: number;
      /** Part maximale de la pression totale d'un taxon venant d'un seul compte. */
      part_max_compte: number;
      /** Part maximale d'une population qu'un cycle de pressions peut retirer (empêche une extinction en un cycle). */
      part_max_population?: number;
      /** Part maximale de la pression totale d'un taxon venant d'un seul jeu, quand plusieurs jeux en montrent le taxon (comptée avant ce plafond, comme part_max_compte) : un jeu de mille joueurs ne fait pas seul l'histoire d'une espèce. */
      part_max_jeu?: number;
    };
    /** Les pressions sont lissées sur autant de cycles (une chasse ponctuelle pèse peu, une chasse soutenue pèse). */
    memoire_cycles?: number;
    /** Lissage de la dénormalisation : autant de prélèvements fictifs répartis selon les fréquences exposées sont ajoutés aux comptes observés, pour qu’une seule bête rare tuée ne vaille pas une persécution (20 par défaut). */
    pseudo_comptes?: number;
  };
}

/** Une lignée de l'instantané. */
export type Lignee = Instantane['taxons'][number];
/** Une population (une lignée dans un biome). */
export type Population = Lignee['populations'][number];
/** Un phénotype : une combinaison de traits et sa fréquence. */
export type Phenotype = Lignee['phenotypes'][number];
/** Un biome de l'instantané. */
export type Biome = Instantane['biomes'][number];
/** Un événement d'un lot de pressions. */
export type Evenement = Lot['evenements'][number];
