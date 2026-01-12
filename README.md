# Spotify Playlist Manager

Une application React + Tailwind avec des Netlify Functions et une petite file de jobs Redis (Upstash) pour générer et enregistrer des playlists Spotify.

Principales fonctionnalités

- Génération asynchrone de playlists (« Generate ») : soumet une requête au backend, la tâche est mise en file (Redis) et exécutée par un worker.
- Enrichissement des résultats avec métadonnées Spotify (année de sortie, genres, popularité) quand disponibles.
- Sauvegarde de playlists directement sur le compte Spotify de l'utilisateur (batch add en 100 URIs).
- Gestion des playlists utilisateur (liste, navigation vers Spotify).
- Interface d'administration (admin) : voir la file, forcer / réenqueuer jobs, métriques simples, gestion des demandes d'accès & rôles.
- Auth sécurisé via OAuth2 (Netlify Functions) avec refresh token stocké côté serveur (Upstash).

Architecture

- Frontend : React + Vite + TailwindCSS.
- Backend : Netlify Functions (dans le dossier `functions/`) pour OAuth (`/login`, `/callback`, `/refresh`), gestion des jobs (`generate_enqueue`, `process_jobs` via worker), playlist CRUD, et endpoints admin.
- Queue / stockage d'état : Upstash Redis (listes, hashes, clés job:{id}).
- Worker : `worker_local.js` pour le développement local ou `functions/process_jobs.js` en production via cron / invocation.
- Enrichissement : appels à l'API Spotify et, si configuré, à l'API Recco (voir `RECCO_BASE_URL`).

Prérequis

- Node.js 18+ et npm
- Un compte Netlify (si vous déployez)
- Un compte Spotify Developer (Client ID + Client Secret)
- Un compte Upstash Redis (REST URL + REST Token) ou un Redis accessible

Variables d'environnement recommandées

Créez un fichier `.env` en local (ne le committez pas) ou configurez ces variables dans Netlify UI :

- `SPOTIFY_CLIENT_ID` - Client ID Spotify
- `SPOTIFY_CLIENT_SECRET` - Client secret Spotify
- `SITE_URL` - URL publique de votre site (ex: `https://mon-site.netlify.app`) - utilisé pour le callback OAuth
- `UPSTASH_REDIS_REST_URL` - URL REST d'Upstash
- `UPSTASH_REDIS_REST_TOKEN` - Token REST d'Upstash
- `ADMIN_BOOTSTRAP_KEY` - (optionnel) clé pour initialiser un admin via `admin_bootstrap` si vous utilisez le script bootstrap
- `RECCO_BASE_URL` - (optionnel) Recco API pour la génération et récupération des données de Track
- `PROCESS_MAX_JOBS` - (optionnel) nombre max de jobs traités par invocation (défaut 10)
- `PROCESS_MAX_TIME_MS` - (optionnel) durée max en ms pour le worker par invocation
- `WORKER_LOCK_TTL` - (optionnel) TTL du lock worker en secondes

Fichier `.env` d'exemple (local)

```
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SITE_URL=http://localhost:8888
UPSTASH_REDIS_REST_URL=your_url_upstash
UPSTASH_REDIS_REST_TOKEN=token_here
RECCO_BASE_URL=https://api.reccobeats.com/v1
PROCESS_MAX_JOBS=10
WORKER_LOCK_TTL=60
PROCESS_MAX_TIME_MS=50000
ADMIN_BOOTSTRAP_KEY=some-secret
```

Installation & exécution locale

1. Installer les dépendances :

```bash
npm install
```

2. Lancer l'interface de développement (Vite) :

```bash
npm run dev
```

3. Pour simuler Netlify Functions localement (recommandé) :

```bash
npm run dev:netlify
```

4. Démarrer le worker local (traite les jobs depuis Redis) :

```bash
npm run worker:local
```

Notes :
- `npm run dev:netlify` démarre un serveur qui expose les fonctions sous `/.netlify/functions/*` ; 
- conservez `worker:local` lancé dans une autre fenêtre pour traiter les jobs.
- Assurez-vous que vos variables d'environnement sont chargées (ex: `netlify dev` lit `.env` automatiquement si présent).

Scripts utiles

- `npm run dev` — démarre Vite (frontend seul)
- `npm run dev:netlify` — démarre Netlify Dev (fonctions + frontend)
- `npm run worker:local` — démarre le worker local qui consomme la file
- `npm run admin:grant` — script utilitaire pour basculer un utilisateur en admin (voir `scripts/grant-admin.js`)

Endpoints importants (frontend appelle via `src/utils/api.js`)

- `/.netlify/functions/login` — redirection vers Spotify OAuth
- `/.netlify/functions/callback` — callback OAuth (stocke refresh token côté serveur)
- `/.netlify/functions/me` — profil utilisateur
- `/.netlify/functions/generate_enqueue` — enfile une requête de génération
- `/.netlify/functions/get_job` — récupérer un job par id
- `/.netlify/functions/get_last_job` — récupérer la dernière génération pour l'utilisateur
- `/.netlify/functions/create_playlist` — créer et ajouter des pistes à une playlist Spotify
- Admin-only : `admin_list_users`, `admin_update_role`, `metrics`, `clear_queue`, `get_all_jobs` (selon rôles)

Déploiement (Netlify)

1. Poussez le repo sur GitHub/GitLab.
2. Créez un site Netlify (link to repo) ou `netlify init` localement.
3. Configurez les variables d'environnement dans Netlify Site settings (voir plus haut).
4. Déployez (ou laissez Netlify déployer automatiquement sur push).

Sécurité & bonnes pratiques

- Ne commitez jamais `.env` ni secrets.
- Les refresh tokens sont sensibles — le projet stocke des tokens côté serveur (Upstash) et renvoie uniquement des access tokens temporaires pour les fonctions.
- Limitez les droits d'admin et initialisez un admin via `ADMIN_BOOTSTRAP_KEY` en local.
- Pour la production, pensez aux quotas et limites Spotify (utilisez des backoffs et cachez / batch les appels lourds).

Dépannage

- Erreur stylelint "Unknown at rule @tailwind" : installez et activez `stylelint-config-tailwindcss` (déjà inclus en `devDependencies`) et créez `.stylelintrc.json` (fournie dans le repo). Rechargez VS Code si nécessaire.
- Si `netlify dev` ne trouve pas vos variables, assurez-vous d'avoir un fichier `.env` ou configured env in Netlify CLI/session.
- Pour vérifier les appels Redis, utilisez l'UI Upstash ou `curl` contre l'URL REST d'Upstash avec le token.

Contribuer

- Les fonctions serverless sont dans `functions/` — privilégiez les fonctions idempotentes et les timeouts courts.
- Les pages React sont sous `src/pages/` et les composants sous `src/components/`.
- Les styles partagés vont dans `src/styles/` (Tailwind + fichiers CSS non-Tailwind pour utilitaires).

Questions ?

Ouvre une issue ou demande-moi comment exécuter un scénario local (ex: "générer une playlist complète et vérifier qu'elle est ajoutée à Spotify").

## Démarrage rapide — enfilez une génération, surveillez le worker, confirmez la playlist (FR)

1. Lancez le serveur local et le worker

```bash
npm install
npm run dev:netlify
npm run worker:local
```

2. Depuis l'interface : enfilez une génération

- Ouvrez http://localhost:8888, connectez-vous avec Spotify, allez sur la page `Generate`, remplissez les champs et cliquez sur Générer.

3. Vérifiez le traitement par le worker (logs)

- Surveillez le terminal du worker : vous devez voir des lignes comme :

	- `Dequeued job: <jobId>`
	- `Processing job <jobId> …`
	- `Generated N tracks for job <jobId>`
	- `Created playlist <playlistId> snapshot <snapshotId>`

4. Confirmez la playlist sur Spotify

- Ouvrez Spotify (même compte que celui utilisé pour l'authentification) et cherchez la playlist créée, ou utilisez la page `Manage Playlists` de l'application.
- Consultez la section « Votre bibliothèque » → « Playlists » pour rechercher une nouvelle playlist créée à l'horodatage de votre tâche, ou utilisez la page « Gérer les playlists » de l'application (`/manage_playlists`) qui répertorie les playlists créées par l'application.

- Vous pouvez également noter l'identifiant `playlistId` ou `snapshotId` affiché dans les journaux du worker et utiliser l'API Web Spotify (ou les points de terminaison `get` de l'application) pour examiner le contenu de la playlist.

-- Dépannage

- Si la tâche est mise en file d'attente mais n'est jamais traitée : vérifiez que `npm run worker:local` est en cours d'exécution et que sa configuration d'environnement (`UPSTASH_REDIS_*`, jetons Spotify) est identique à celle des fonctions Netlify.
-  Si la création de la playlist a échoué et qu'elle est vide : l'application utilise des lots de 100 URI lors de l'ajout de titres.
- Si vous voyez des erreurs Spotify 400 : assurez-vous que l’application envoie des identifiants Spotify canoniques (sans préfixe) et que le jeton d’accès est valide.

-----

English Traduction

# Spotify Playlist Manager

This repository contains a React + Tailwind frontend and Netlify Functions backend that implement a playlist-generation and management application for Spotify. It uses Upstash (Redis) as a simple job queue and for storing user/session data.

Features

- Asynchronous generation queue: the frontend enqueues generation requests, which are processed asynchronously by a worker. This avoids Lambda timeouts and keeps the UI responsive.
- Spotify enrichment: when available, generated tracks are enriched with Spotify metadata (release year, artist genres, popularity).
- Playlist saving: create playlists on a user's Spotify account and add tracks in batches (100 URIs per request to respect Spotify limits).
- Playlist management: list user playlists and open them in Spotify.
- Admin UI: view and manage the generation queue, force/requeue jobs, view basic metrics, and manage access requests/roles.
- Secure OAuth2 flow: refresh tokens are stored server-side (Upstash); access tokens are issued to functions as needed.

Repository structure (high level)

- `functions/` — Netlify serverless functions (OAuth, enqueueing, job processing helpers, playlist creation, admin endpoints).
- `worker_local.js` — local worker that polls Redis and runs the generation logic (used in development).
- `src/` — React frontend (pages, components, utils). Main pages: `generate`, `manage_playlists`, `admin`, `job`.
- `src/styles/` — shared CSS utilities alongside Tailwind.

Prerequisites

- Node.js 18+ and npm
- A Netlify account (for deployment) or `netlify-cli` for local testing
- A Spotify Developer account (Client ID + Client Secret)
- An Upstash Redis account (REST URL + REST token) or a Redis instance accessible by the functions

Environment variables

Set these in a local `.env` (do not commit) or in Netlify Site settings:

- `SPOTIFY_CLIENT_ID` — Spotify client id
- `SPOTIFY_CLIENT_SECRET` — Spotify client secret
- `SITE_URL` — Public site URL (e.g. `https://your-site.netlify.app`) used for OAuth callback
- `UPSTASH_REDIS_REST_URL` — Upstash REST URL
- `UPSTASH_REDIS_REST_TOKEN` — Upstash REST token
- `ADMIN_BOOTSTRAP_KEY` — (optional) key used by `admin_bootstrap` script to initialize an admin
- `RECCO_BASE_URL` — (optional) Recco API base URL for enrichment
- `PROCESS_MAX_JOBS` — (optional) max jobs per worker invocation (default: 10)
- `PROCESS_MAX_TIME_MS` — (optional) max worker runtime per invocation (ms)
- `WORKER_LOCK_TTL` — (optional) worker lock TTL (seconds)

Example `.env` (local)

```
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SITE_URL=http://localhost:8888
UPSTASH_REDIS_REST_URL=your_upstash_uri
UPSTASH_REDIS_REST_TOKEN=token_here
RECCO_BASE_URL=https://api.reccobeats.com/v1
PROCESS_MAX_JOBS=10
WORKER_LOCK_TTL=60
PROCESS_MAX_TIME_MS=50000
ADMIN_BOOTSTRAP_KEY=some-secret
```

Local development

1. Install dependencies:

```bash
npm install
```

2. Start the frontend (Vite):

```bash
npm run dev
```

3. Run Netlify Dev to serve functions locally (recommended):

```bash
npm run dev:netlify
```

4. Start the local worker to process jobs from Redis (separate terminal):

```bash
npm run worker:local
```

Notes

- `npm run dev:netlify` exposes functions under `/.netlify/functions/*`. Keep `worker:local` running separately to process jobs.
- Netlify Dev reads a local `.env` file by default; ensure your environment variables are present.

Helpful scripts

- `npm run dev` — start Vite
- `npm run dev:netlify` — start Netlify Dev (frontend + functions)
- `npm run worker:local` — start the local worker that consumes the job queue
- `npm run admin:grant` — helper script to grant admin role (see `scripts/grant-admin.js`)

Key endpoints (used by `src/utils/api.js`)

- `/.netlify/functions/login` — redirect to Spotify for OAuth
- `/.netlify/functions/callback` — OAuth callback that stores refresh token server-side
- `/.netlify/functions/me` — current user profile
- `/.netlify/functions/generate_enqueue` — enqueue a generation job
- `/.netlify/functions/get_job` — fetch a job by id
- `/.netlify/functions/get_last_job` — fetch the user's last generation job
- `/.netlify/functions/create_playlist` — create a playlist and add tracks to Spotify
- Admin: `admin_list_users`, `admin_update_role`, `metrics`, `clear_queue`, `get_all_jobs` (admin-only)

How generation works (high level)

1. Frontend calls `generate_enqueue` with generation parameters (BPM range, danceability, styles, year range, length).
2. Function enqueues a job in Redis and triggers the worker (or the worker polls the queue periodically).
3. Worker (`generate_core`) collects candidate tracks, optionally enriches them via Spotify/Recco, scores and selects tracks, and stores the result in Redis under `job:{id}`.
4. Frontend polls `get_job` (or `get_last_job`) until the job is `done` and displays the results; user can save the selection as a Spotify playlist.

Notes on Spotify API usage

- Tracks are added to playlists in batches of 100 URIs (Spotify API limit).
- The generator sanitizes and extracts canonical Spotify IDs from collected items before calling Spotify endpoints.
- Implement exponential backoff and respect rate limits when calling external APIs.

Troubleshooting

- Stylelint error "Unknown at rule @tailwind": install `stylelint-config-tailwindcss` and add `.stylelintrc.json` (this repo includes a config). Restart VS Code if the extension still reports the error.
- If Netlify Dev doesn't pick up env vars, verify your `.env` or Netlify CLI session.
- Inspect Redis keys using Upstash UI or by calling the Upstash REST API with the REST token.

Security notes

- Do not commit `.env` or any secrets.
- Refresh tokens are stored server-side (Upstash) — the client never receives them directly.
- Restrict admin privileges; use `ADMIN_BOOTSTRAP_KEY` for a one-time admin setup if needed.

Contributing

- Functions live in `functions/` — keep them idempotent and with limited execution time.
- Frontend pages are in `src/pages/` and components in `src/components/`.
- Shared styles live in `src/styles/` (Tailwind + utility CSS files).

## Quick Start — enqueue a generation, watch worker, confirm playlist

Follow these steps to enqueue a generation job from the UI, verify the worker processed it, and confirm a playlist was created on Spotify.

1. Start the local dev server and the local worker

```bash
npm install
npm run dev:netlify   # starts the app (Netlify Dev)
npm run worker:local  # starts the local worker that processes jobs
```

2. From the UI: enqueue a generation job

- Open your browser at the app served by Netlify Dev (usually http://localhost:8888).
- Sign in with Spotify (if not already). Navigate to the `Generate` page (`/generate`).
- Fill generator inputs and click the Generate / Start button. That action enqueues a job in Redis and returns a job id.

3. Verify the worker processed the job (logs)

- Watch the terminal running `npm run worker:local`. Look for logs similar to:

	- `Dequeued job: <jobId>`
	- `Processing job <jobId> …`
	- `Generated N tracks for job <jobId>`
	- `Created playlist <playlistId> snapshot <snapshotId>`

- If you don't see processing logs, ensure the worker is connected to the same Redis/Upstash instance and that locks are being acquired. Check environment variables used by `worker_local.js` / the Netlify functions.

4. Confirm the playlist on Spotify

- Open the Spotify account used to authorize the app (web or desktop client).
- Look under `Your Library` → `Playlists` for a new playlist created at the timestamp of your job, or use the `Manage Playlists` page in the app (`/manage_playlists`) which lists playlists created by the app.
- Alternatively, note the `playlistId` or `snapshotId` printed in the worker logs and use the Spotify Web API (or the app's `get` endpoints) to inspect the playlist contents.

-- Troubleshooting

- If the job enqueues but never processes: confirm `npm run worker:local` is running and has the same environment configuration (`UPSTASH_REDIS_*`, Spotify tokens) as the Netlify functions.
- If playlist creation failed with an empty playlist: check worker logs for the batch-add requests; the app uses batches of 100 URIs when adding tracks.
- If you see Spotify 400 errors: ensure the app is sending canonical Spotify IDs (no prefixes) and that the access token is valid.