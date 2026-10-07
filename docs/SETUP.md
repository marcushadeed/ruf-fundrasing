# Setup: Google Sheet, sign-in, and sharing

About 15–20 minutes, once. Afterwards you only edit the Sheet.

## How privacy works

- The dashboard is a static website. It contains **no data**, so the code and the site URL can be public.
- Viewers sign in with Google, and the browser reads the Sheet **as that person** (read-only).
  Someone who opens the site without access to the Sheet sees an error, not data.
- To share: share the **Sheet** with the person (Viewer is enough) and send them the site link.
  To revoke access, unshare the Sheet.

## 1. Create the Sheet

1. Generate the template (a copy is already committed in `template/`):
   ```bash
   npm run template                  # empty data tabs, goals/milestones/stages prefilled
   npm run template -- --with-sample # same, with demo data to play with
   ```
2. In Google Drive: **New → File upload** → `template/RUF-Funding-Template.xlsx`, then open it and choose
   **File → Save as Google Sheets**. Use the new Google Sheets copy and delete the uploaded `.xlsx`.
3. Copy the Sheet's URL. You'll need it later (or its ID: the part between `/d/` and `/edit`).
4. Check the **Years** and **Milestones** tabs. Adjust the goals and dates as plans change. The "How to use" tab explains every column.

## 2. Google Cloud: enable the API and create a sign-in client

1. Go to <https://console.cloud.google.com/>, then **Select a project → New project** (e.g. "ruf-dashboard").
2. **APIs & Services → Library** → search **Google Sheets API** → **Enable**.
3. **Google Auth Platform** (or **APIs & Services → OAuth consent screen**):
   - App name: anything (e.g. "RUF Dashboard"); user support and developer emails: yours.
   - Audience: **External**, publishing status **Testing**.
   - **Test users**: add your Google account **and** the person you're sharing with.
     Only test users can sign in while the app is in Testing mode, which is ideal here.
   - Data access / scopes: add `https://www.googleapis.com/auth/spreadsheets.readonly`.
4. **Clients → Create client** (or **Credentials → Create credentials → OAuth client ID**):
   - Type: **Web application**
   - **Authorized JavaScript origins** (origins only, no paths):
     - `http://localhost:5173` (local dev)
     - your deployed origin, e.g. `https://<your-github-username>.github.io`
   - No redirect URIs are needed.
5. Copy the **Client ID** (`…apps.googleusercontent.com`). It isn't a secret.

When you sign in, Google shows "Google hasn't verified this app". That's expected for a Testing-mode app; choose **Continue**.

## 3. Run locally

```bash
cp .env.example .env.local   # fill in VITE_GOOGLE_CLIENT_ID and VITE_SHEET_ID
npm install
npm run dev                  # http://localhost:5173
```

`VITE_SHEET_ID` is optional. Without it, the app asks for the Sheet link and remembers it in that browser.
You can also pass `?sheet=<url-or-id>` in the URL. `?demo` always shows bundled demo data with no sign-in.

## 4. Deploy (GitHub Pages)

1. Create a GitHub repo and push this project. A public repo is fine because it contains no real data.
2. Repo **Settings → Pages → Source: GitHub Actions**.
3. Repo **Settings → Secrets and variables → Actions → Variables**: add `VITE_GOOGLE_CLIENT_ID`
   and (optionally) `VITE_SHEET_ID`.
4. Push to `main`. `.github/workflows/deploy.yml` tests, builds, and publishes to
   `https://<user>.github.io/<repo>/`.
5. Make sure `https://<user>.github.io` is in the OAuth client's **Authorized JavaScript origins**.

Vercel or Netlify work too: build command `npm run build`, output `dist`, and set the same two env vars.
Add the resulting origin to the OAuth client.

## 5. Share

1. Share the Google Sheet with the other person (**Viewer**).
2. Add their Google account as a **test user** (step 2.3).
3. Send them the site link.

## Troubleshooting

| Message | Fix |
|---|---|
| "doesn't have access to this Sheet" | Share the Sheet with that Google account, or sign out and use the right account. |
| "Google Sheets API isn't enabled" | Step 2.2. |
| Google error `redirect_uri_mismatch` / `origin_mismatch` | Add the exact site origin to Authorized JavaScript origins (can take a few minutes to apply). |
| "Access blocked: app has not completed verification" | Add the account as a test user. |
| Yellow "rows need attention" box | It names the tab and row; fix the cell in the Sheet and hit Refresh. |
