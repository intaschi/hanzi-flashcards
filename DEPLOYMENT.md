# Deploying to GitHub Pages

This app is a static site (Vite + Preact) with no backend. It deploys to GitHub Pages as a
**project site** — `https://<your-username>.github.io/hanzi-flashcards/` — separate from any
personal/user site (`https://<your-username>.github.io/`) you might already have.

Deployment is automated via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml):
every push to `main` builds the site and publishes it through GitHub's official Pages Actions
(`actions/upload-pages-artifact` + `actions/deploy-pages`) — no `gh-pages` branch, no build
output committed to git.

## 1. One-time setup

### 1.1 Confirm the base path

`vite.config.ts` sets:

```ts
export default defineConfig({
  base: '/hanzi-flashcards/',
  // ...
})
```

This **must match your repo name exactly** (case-sensitive), since GitHub Pages serves a
project site at `/<repo-name>/`. If you rename the repo, update this value to match — a
mismatch is the single most common cause of a blank page or missing assets after deploy (see
Troubleshooting below).

### 1.2 Create the GitHub repository

Using the `gh` CLI, from inside this project directory:

```bash
gh repo create hanzi-flashcards --public --source=. --remote=origin
```

This creates the repo under your default `gh` account and wires up `origin`. If you use `gh`
with multiple accounts, switch first:

```bash
gh auth switch --user <your-personal-github-username>
```

### 1.3 Push

```bash
git add -A
git commit -m "Initial commit"
git push -u origin main
```

(If you've already committed locally, just run the `push` step.)

### 1.4 Point Pages at GitHub Actions as the build source

New repos default Pages to "deploy from a branch." Switch it to "GitHub Actions" so the
workflow in this repo is what actually publishes the site:

```bash
gh api -X PUT repos/:owner/hanzi-flashcards/pages -f build_type=workflow
```

If that 404s (Pages isn't enabled yet on a brand-new repo), create it first, then set the
build type:

```bash
gh api -X POST repos/:owner/hanzi-flashcards/pages -f build_type=workflow
```

Equivalent web UI path, if you'd rather click through it once to see it: repo → **Settings**
→ **Pages** → **Build and deployment** → **Source** → **GitHub Actions**.

## 2. Every deploy after that

Just push to `main`:

```bash
git push
```

The workflow runs automatically: checks out the repo, installs deps (`npm ci`), runs
`npm run build`, uploads `dist/` as a Pages artifact, and publishes it. Watch it with:

```bash
gh run watch
```

or check the **Actions** tab on the repo.

To deploy without a new commit (e.g. after only changing a GitHub secret or re-running a
failed job), trigger it manually:

```bash
gh workflow run deploy.yml
```

## 3. Finding your live URL

```bash
gh api repos/:owner/hanzi-flashcards/pages --jq .html_url
```

It'll be `https://<your-username>.github.io/hanzi-flashcards/`. First deploy can take a
minute or two to actually go live even after the workflow shows green.

## 4. Adding more character batches later

New locked batches are added by editing `public/data/manifest.json` (see the `chunks` array)
and dropping the new `data/cards/<range>.json` file into `public/data/cards/`. Once that's
committed and pushed to `main`, the next deploy picks it up automatically — no workflow
changes needed.

## Troubleshooting

- **Blank page, or the page loads but every asset 404s**: almost always a `base` mismatch
  between `vite.config.ts` and the actual repo name. Fix the `base` value, commit, push.
- **Workflow fails on `npm ci`**: usually means `package-lock.json` wasn't committed, or is
  out of sync with `package.json`. Run `npm install` locally, commit the updated lockfile.
- **Pages tab shows "not enabled" / 404 from the `gh api` calls in step 1.4**: the repo needs
  at least one successful push first — try again after step 1.3.
- **Workflow succeeds but the live site still shows old content**: GitHub's Pages CDN can
  take a minute to invalidate; hard-refresh or wait briefly before assuming something's wrong.
- **Testing the production build locally before pushing**: `npm run build && npm run preview`
  — `vite preview` (unlike `vite dev`) actually respects the `base` path, so it's the real
  smoke test for GitHub-Pages-subpath bugs.
test
