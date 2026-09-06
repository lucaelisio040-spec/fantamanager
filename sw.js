/* Fantamanager — service worker
   Strategia "prima la rete": quando c'e' connessione si scarica sempre la
   versione piu' recente, cosi' caricando un index.html nuovo su GitHub tutti
   lo vedono subito. La copia in cache serve solo come rete di salvataggio
   quando il telefono e' offline. */

const CACHE = "fantamanager-v1";
const BASE  = new URL("./", self.location).pathname;

// il minimo per aprire l'app anche senza rete
const ESSENZIALI = [
  BASE,
  BASE + "index.html",
  BASE + "manifest.json",
  BASE + "icona-192.png",
  BASE + "icona-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ESSENZIALI))
      .catch(() => {})          // se un file manca, l'installazione prosegue lo stesso
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(chiavi => Promise.all(chiavi.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if(req.method !== "GET") return;                       // le scritture non si toccano

  const url = new URL(req.url);
  // le chiamate al database devono sempre passare dalla rete, mai dalla cache
  if(url.hostname.endsWith("supabase.co")) return;

  e.respondWith(
    fetch(req)
      .then(risp => {
        if(risp && risp.ok && url.origin === self.location.origin){
          const copia = risp.clone();
          caches.open(CACHE).then(c => c.put(req, copia));
        }
        return risp;
      })
      .catch(async () => {
        const salvata = await caches.match(req);
        if(salvata) return salvata;
        // navigazione senza rete: si riapre comunque l'app
        if(req.mode === "navigate") return caches.match(BASE + "index.html");
        throw new Error("non disponibile offline");
      })
  );
});
