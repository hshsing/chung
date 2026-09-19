# AGENTS.md

- Stack: Cloudflare Pages (static `public/` + Pages Functions `functions/api/` + Workers AI binding `AI`).
- Entrypoint: `public/index.html` (single-file app, Tesseract.js + OpenCC CDN fallback when /api/* 501).
- Deploy: Git-connected Pages, project `hshsing`, Build command empty, Output dir `public`. Local preview: `npx wrangler pages dev ./public`.
- Manual deploy (fallback): `wrangler pages deploy ./public --project-name=hshsing`.
- Ignored (not deployed): `/pdfs/` (19 PDFs ~92MB local only), `.wrangler/`, `.env`, `/index.html` (deleted duplicate).
- Fix 2026-09-19: removed duplicate `const r=await fetch('/api/solve')` SyntaxError in tryPost().
