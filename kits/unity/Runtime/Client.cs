// Orvane — LIRE LE MONDE, DÉPOSER LES LOTS (kits/unity/Runtime/Client.cs) — docs/44
// Deux façons de faire la même chose :
//  - dans Unity : des coroutines, avec UnityWebRequest (StartCoroutine(OrvaneUnity.Lire(…))) — marche partout, WebGL compris ;
//  - ailleurs (un serveur de jeu, un outil, les essais) : OrvaneHttp, avec HttpClient et async/await.
// L'adresse du monde, celle du Supabase d'Orvane et sa clé publique sont celles du monde d'Orvane (BRANCHER-UN-JEU.md). La clé du
// jeu vient de la page d'inscription. La clé d'administration ne va jamais dans un jeu publié.
using System;
using System.Collections.Generic;
using System.Text;
using Newtonsoft.Json;

namespace Orvane
{
    /// <summary>Où lire le monde, où déposer les lots.</summary>
    public class Branchement
    {
        public string MondeUrl = "https://stonevalleyoff-ai.github.io/orvane/mondes/orvane/";
        public string SupabaseUrl = "https://rospodujiyltmxitykwc.supabase.co";
        public string ClePublique = "sb_publishable_F98uYIaPrLTjhj3n7QiBOg_SOtFynn8";   // la clé publique du Supabase d'Orvane
        public string CleJeu;                                                            // la clé du jeu (orv_…), reçue à l'inscription

        public string Instantane => MondeUrl.TrimEnd('/') + "/instantane.json";
        public string Generation0 => MondeUrl.TrimEnd('/') + "/generation-0.json";
        public string Depot => SupabaseUrl.TrimEnd('/') + "/rest/v1/rpc/orvane_deposer";
        /// <summary>Le corps de l'appel orvane_deposer : la clé du jeu, le compte opaque du joueur, le lot.</summary>
        public string CorpsDepot(string compte, string lotJson) =>
            "{\"p_cle\":" + JsonConvert.ToString(CleJeu ?? "") + ",\"p_compte\":" + JsonConvert.ToString(compte ?? "") + ",\"p_lot\":" + lotJson + "}";
    }

#if UNITY_5_3_OR_NEWER
    /// <summary>Dans Unity : StartCoroutine(OrvaneUnity.Lire(b, inst => …, erreur => …)).</summary>
    public static class OrvaneUnity
    {
        public static System.Collections.IEnumerator Lire(Branchement b, Action<Instantane> fini, Action<string> erreur = null, string url = null)
        {
            using (var r = UnityEngine.Networking.UnityWebRequest.Get(url ?? b.Instantane))
            {
                r.SetRequestHeader("Cache-Control", "no-cache");
                yield return r.SendWebRequest();
                if (r.result != UnityEngine.Networking.UnityWebRequest.Result.Success) { erreur?.Invoke(r.error); yield break; }
                Instantane inst = null; string e = null;
                try { inst = Instantane.Lire(r.downloadHandler.text); } catch (Exception x) { e = x.Message; }
                if (inst != null) fini?.Invoke(inst); else erreur?.Invoke(e ?? "instantané illisible");
            }
        }

        /// <summary>Dépose le prochain lot du compteur ; s'il est accepté, le compteur l'oublie, sinon il le garde pour plus tard.</summary>
        public static System.Collections.IEnumerator Deposer(Branchement b, Compteur c, string compte, Action<Reponse> fini = null)
        {
            var lot = c.Prochain(); if (lot == null) { fini?.Invoke(new Reponse { Ok = true }); yield break; }
            using (var r = new UnityEngine.Networking.UnityWebRequest(b.Depot, "POST"))
            {
                r.uploadHandler = new UnityEngine.Networking.UploadHandlerRaw(Encoding.UTF8.GetBytes(b.CorpsDepot(compte, lot)));
                r.downloadHandler = new UnityEngine.Networking.DownloadHandlerBuffer();
                r.SetRequestHeader("Content-Type", "application/json"); r.SetRequestHeader("apikey", b.ClePublique);
                yield return r.SendWebRequest();
                var rep = r.result == UnityEngine.Networking.UnityWebRequest.Result.Success ? Lire(r.downloadHandler.text) : Reponse.Echec(r.error);
                if (rep.Ok) c.Depose();
                fini?.Invoke(rep);
            }
        }
        static Reponse Lire(string t) { try { return JsonConvert.DeserializeObject<Reponse>(t) ?? Reponse.Echec("réponse vide"); } catch (Exception e) { return Reponse.Echec(e.Message); } }
    }
#else
    /// <summary>Hors de Unity : await new OrvaneHttp(b).LireAsync().</summary>
    public class OrvaneHttp
    {
        readonly Branchement b; readonly System.Net.Http.HttpClient http;
        public OrvaneHttp(Branchement b, System.Net.Http.HttpClient http = null) { this.b = b; this.http = http ?? new System.Net.Http.HttpClient(); }

        public async System.Threading.Tasks.Task<Instantane> LireAsync(string url = null)
        {
            using (var q = new System.Net.Http.HttpRequestMessage(System.Net.Http.HttpMethod.Get, url ?? b.Instantane))
            {
                q.Headers.CacheControl = new System.Net.Http.Headers.CacheControlHeaderValue { NoCache = true };
                var r = await http.SendAsync(q); r.EnsureSuccessStatusCode();
                return Instantane.Lire(await r.Content.ReadAsStringAsync());
            }
        }

        /// <summary>Dépose le prochain lot du compteur ; s'il est accepté, le compteur l'oublie.</summary>
        public async System.Threading.Tasks.Task<Reponse> DeposerAsync(Compteur c, string compte)
        {
            var lot = c.Prochain(); if (lot == null) return new Reponse { Ok = true };
            using (var q = new System.Net.Http.HttpRequestMessage(System.Net.Http.HttpMethod.Post, b.Depot))
            {
                q.Headers.Add("apikey", b.ClePublique);
                q.Content = new System.Net.Http.StringContent(b.CorpsDepot(compte, lot), Encoding.UTF8, "application/json");
                Reponse rep;
                try { var r = await http.SendAsync(q); var t = await r.Content.ReadAsStringAsync(); rep = JsonConvert.DeserializeObject<Reponse>(t) ?? Reponse.Echec("réponse vide"); }
                catch (Exception e) { rep = Reponse.Echec(e.Message); }
                if (rep.Ok) c.Depose();
                return rep;
            }
        }
    }
#endif
}
