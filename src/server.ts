import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import lettersData from '../public/assets/data/letters.json';

const browserDistFolder = join(import.meta.dirname, '../browser');

const angularApp = new AngularNodeAppEngine();
const app = express();

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req, {
      // 👇 Aquí definimos el prerender dinámico
      render: {
        getPrerenderParams: (route: string) => {
          if (route === '/letter/:id') {
            return (lettersData as any[]).map((letter) => ({
              id: letter.id.toString(),
            }));
          }
          return [];
        },
      },
    })
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point.
 */
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) throw error;
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler for Angular CLI or Firebase Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
