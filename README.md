# Spotify Playlist Manager — Netlify + React

This repo is a self-contained single-file React frontend + Netlify Functions backend for managing Spotify playlists for any user who logs in via Spotify OAuth. It supports create, list, update (rename/description), add tracks, remove tracks, and unfollow (delete) playlist.

---

## Project structure (all files below)

## package.json
## netlify.toml
## index.html (React single-file app)
## Netlify Functions (functions/*.js)

> All functions use axios. Make sure to set environment variables on Netlify:
> - SPOTIFY_CLIENT_ID
> - SPOTIFY_CLIENT_SECRET
> - SITE_URL (optional; used to build redirect URI if you prefer)

### functions/login.js
### functions/callback.js
### functions/refresh.js
### functions/list.js
### functions/create.js
### functions/add.js
### functions/remove.js
### functions/update.js
### functions/delete.js

## How to deploy on Netlify (step-by-step)

1. Create a new Git repo locally with the files above, or copy them into a folder.
2. Install Netlify CLI: `npm i -g netlify-cli`.
3. `npm install` to install axios locally (used by functions).
4. `netlify login` then `netlify init` (create & link a new site) and choose your account.
5. Set environment variables on Netlify (Site settings > Build & deploy > Environment):
   - `SPOTIFY_CLIENT_ID` = your client id (6e5b74c1...)
   - `SPOTIFY_CLIENT_SECRET` = your client secret
   - `SITE_URL` = `https://{your-netlify-site}.netlify.app` (optional but recommended)
6. Deploy with `netlify deploy --prod` or push to Git and let Netlify auto-deploy.
7. In Spotify Developer Dashboard, set Redirect URI to:
   - `https://{your-netlify-site}.netlify.app/callback`
8. Visit `https://{your-netlify-site}.netlify.app/` and click "Se connecter à Spotify". After authorizing, you will be redirected back and tokens stored in localStorage.

---

## Security notes & improvements

- Current demo stores tokens in `localStorage` for simplicity. For a production app, prefer server-side session storage or httpOnly secure cookies.
- You can implement PKCE flow to avoid storing client secret on the server and for better security.
- Token refresh is handled by `functions/refresh.js` which requires `SPOTIFY_CLIENT_SECRET` to create a new access token from a `refresh_token`.
- Rate limits: Respect Spotify Web API rate limits and add retry/exponential backoff if needed.

---

## Next steps I can do

- Replace the vanilla JS UI with a polished React + Tailwind frontend (single-file or multi-file).
- Add proper pagination for playlists, search for tracks to add by name, and batch add for long playlists (split into multiple requests).
- Implement server-side sessions so refresh tokens never touch the browser.