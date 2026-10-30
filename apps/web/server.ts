import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import bootstrap from './src/main.server';

// Le dossier dist du build Angular
const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');
const indexHtml = join(serverDistFolder, 'index.server.html');

const app = express();
// Ne pas annoncer le framework et sa version dans chaque réponse.
app.disable('x-powered-by');
const commonEngine = new CommonEngine();

// Servir les fichiers statiques
app.get('*.*', express.static(browserDistFolder, { maxAge: '1y' }));

// Routes Angular SSR
app.get('*', (req, res, next) => {
  const { protocol, originalUrl, baseUrl, headers } = req;

  commonEngine
    .render({
      bootstrap,
      documentFilePath: indexHtml,
      url: `${protocol}://${headers.host}${originalUrl}`,
      publicPath: browserDistFolder,
      providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
    })
    .then((html) => res.send(html))
    .catch((err) => next(err));
});

const port = process.env['PORT'] || 4000;
app.listen(port, () => {
  console.log(`AfriDev Hub SSR server ready on http://localhost:${port}`);
});
