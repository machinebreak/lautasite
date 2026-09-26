# lauta.site

Portfolio personal de Lautaro Bertucci, construido como una página estática con
React, TypeScript y Vite.

## Desarrollo

```bash
npm install
npm run dev
```

## Verificación

```bash
npm run check
```

El comando ejecuta lint, pruebas automatizadas, comprobación de tipos y build de
producción.

## Deploy en Vercel

Vercel detecta el proyecto como Vite automáticamente:

- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install`

Después del primer deploy, agregá `lauta.site` desde **Settings → Domains** en
Vercel y copiá los registros DNS indicados al proveedor donde compraste el
dominio.
