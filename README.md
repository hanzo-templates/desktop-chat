# Chat

Desktop AI client — streaming SSE to any OpenAI-compatible gateway, threads and API key kept out of web storage.

A **Hanzo desktop template**: one codebase, three installers (macOS, Windows,
Linux) and a web build. Fork it, `npm i`, ship.

- Live web preview: <https://desktop-chat.hanzo.app>
- Installers: <https://github.com/hanzo-templates/desktop-chat/releases/latest>
- Source: <https://github.com/hanzo-templates/desktop-chat>

## Why this exists

A native app cannot be iframed, so the gallery preview is a *real* build of the
same UI — not a screenshot and not a dead link. `src/native.ts` is the only file
that knows whether it is running inside the Tauri window or a browser tab;
everything above it is one app.

## Stack

| Layer    | Choice |
| -------- | ------ |
| Shell    | Tauri v2 (Rust core, system webview — installers are single-digit MB, not 150 MB) |
| UI       | React 19 + Vite 7 + TypeScript |
| Backend  | [`@hanzo/base`](https://www.npmjs.com/package/@hanzo/base) — collections, realtime, CRDT |
| Runtime  | `a.hanzo.ai` analytics + chat, loaded from `index.html` |
| Native   | API key + thread history in the OS config dir (0600), never in localStorage |

## Run

```bash
npm install
npm run desktop        # Tauri dev window
npm run dev            # browser, same UI, web fallbacks
npm run desktop:build  # installers for the host OS
npm run build          # static web build -> dist/
```

Linux build deps: `libwebkit2gtk-4.1-dev libgtk-3-dev librsvg2-dev patchelf`.

## Backend

`src/base.ts` points at `https://base.hanzo.ai`. Point a fork at its own with
`VITE_BASE_URL`. Base is optional — the app renders and works offline, the
status bar just says so.

## Release

Push a `v*` tag. `.github/workflows/release.yml` fans out to macOS (arm64 +
x86_64), Windows and Linux runners and attaches `.dmg` / `.msi` / `.AppImage` /
`.deb` to the GitHub release. Desktop bundles must be built on their
target OS, which is why this one workflow uses per-platform runners.

## Upstream & license

Scaffold derived from **Tauri v2 app template + OpenAI-compatible streaming client** (https://github.com/tauri-apps/tauri/tree/dev/examples/api), MIT / Apache-2.0.
This template is MIT — see [LICENSE](./LICENSE). Every dependency is
MIT/Apache-2.0/BSD; nothing copyleft is pulled in, so a fork can be
commercialised without contaminating it.
