# Remove Background Images

An SEO-friendly, browser-only image background remover by **Platka Software Digital**. It uses `@imgly/background-removal` with WASM/ONNX, so image processing happens locally on the visitor's device and no backend or API key is required.

Live site: [platka-removebg.pages.dev](https://platka-removebg.pages.dev)

## Features

- Drag and drop or select JPG, PNG, and WEBP files.
- Paste an image directly from the clipboard with `Ctrl + V`.
- Load a public image URL directly in the browser.
- Original and transparent checkerboard result previews.
- Client-side background removal with progress feedback.
- PNG download, responsive mobile layout, and validation up to 10 MB.
- Full-precision `isnet` quality mode, lossless PNG output, original-resolution preservation, and light alpha-edge cleanup.
- Privacy Policy, Terms & Conditions, and Contact pages.
- SEO description, Open Graph tags, canonical URL, JSON-LD, robots.txt, and sitemap.xml.

## Technology

- Vite 5
- React 18
- `@imgly/background-removal`
- Cloudflare Pages
- Wrangler CLI

## Local development

Requirements: Node.js 18+ and npm.

```bash
npm install
npm run dev
```

Open the local URL shown by Vite, usually `http://localhost:5173`.

Create a production build locally:

```bash
npm run build
npm run preview
```

## Cloudflare Pages deployment

Authenticate with the Cloudflare account that owns the Pages project:

```bash
npm install -g wrangler
npx wrangler login
```

Build and deploy:

```bash
npm run build
npx wrangler pages deploy dist --project-name=platka-removebg
```

The project is configured in `wrangler.toml` with `pages_build_output_dir = "./dist"`. The first project creation, if needed, is:

```bash
npx wrangler pages project create platka-removebg --production-branch main --force
```

The `--force` flag was needed once because the installed Wrangler version attempted a newer Workers delegation. It is not needed for future deploys.

## URL input and privacy

URL images are fetched by the visitor's browser. The source host must allow CORS requests. Images selected, pasted, or fetched from a compatible URL are processed locally and are not uploaded to this application. The first processing run may download the AI model files required by the browser.

## Project structure

```text
├── public/
│   ├── logo.png
│   ├── robots.txt
│   └── sitemap.xml
├── src/
│   ├── main.jsx
│   └── styles.css
├── index.html
├── package.json
└── wrangler.toml
```

## Contact

- Email: [platkasoftwaredigital@gmail.com](mailto:platkasoftwaredigital@gmail.com)
- Phone: [081111102880](tel:+6281111102880)
- Official websites: [platkadigital.com](https://platkadigital.com) · [platka.io](https://platka.io)
