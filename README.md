# Spotify Playlist Manager — React + Tailwind + Netlify

This repository is a full source template for a secure Spotify Playlist Manager that includes:
- React + Tailwind frontend
- Netlify Functions backend for OAuth, token refresh and playlist management
- A `generateRunningPlaylist` function that builds your 3-hour electro running playlist tuned for 160–180 cadence

---

## Project structure (all files below)

- TODO

## Netlify Functions (server-side)

> All functions use `axios`. Remember to `npm install axios` before deploying.

---

## Deployment & Environment variables (what you must set on Netlify)

- `SPOTIFY_CLIENT_ID` = your client id
- `SPOTIFY_CLIENT_SECRET` = your client secret
- `SITE_URL` = `https://{your-netlify-site}.netlify.app` (recommended)

Make sure in Spotify Developer Dashboard you add the redirect URI:

```
https://{your-netlify-site}.netlify.app/callback
```

---

## Quick deploy steps

1. Create a Git repo and push the files structured as above.
2. `npm install` locally to get axios.
3. `netlify login` and `netlify init` (create a new site).
4. In Netlify site settings, add the environment variables above.
5. `netlify deploy --prod` or connect the Git repo in Netlify for automatic deploys.
6. Visit your site, click "Se connecter à Spotify" and authorize. Then use the "Générer ma playlist de course" button.

---

## Notes & Improvements

- Security: refresh token is stored in an HttpOnly secure cookie here. For larger scale you should store refresh tokens server-side in a database keyed by user ID or session.
- PKCE: For enhanced security (no client secret exposed anywhere), implement PKCE flow on client side.
- Rate limiting & retries: Add exponential backoff for Spotify API calls.
- Searching & UI: We can add search UI to add tracks by name, and pagination for playlists.

---

## Next steps I can do

- Replace the vanilla JS UI with a polished React + Tailwind frontend (single-file or multi-file).
- Add proper pagination for playlists, search for tracks to add by name, and batch add for long playlists (split into multiple requests).
- Implement server-side sessions so refresh tokens never touch the browser.