import cors from "cors";
import express from "express";
import { adminRouter } from "../controllers/admin.controller";
import { breedsRouter } from "../controllers/breeds.controller";
import { itemsOfficialRouter } from "../controllers/itemsOfficial.controller";
import { healthRouter } from "../controllers/health.controller";
import { quotesCreateRouter } from "../controllers/quotesCreate.controller";
import { quotesExploreRouter } from "../controllers/quotesExplore.controller";
import { quotesSeedRouter } from "../controllers/quotesSeed.controller";
import { salespeopleRouter } from "../controllers/salespeople.controller";
import { getAllowedCorsOrigins } from "../settings";

export function createApp(): express.Express {
  const app = express();
  const allowedOrigins = getAllowedCorsOrigins();

  app.use(express.json());
  app.use(
    cors({
      origin(origin, callback) {
        // Allow same-origin/non-browser requests with no Origin header.
        if (!origin) {
          callback(null, true);
          return;
        }

        callback(null, allowedOrigins.includes(origin));
      },
      credentials: true,
    }),
  );

  app.use(healthRouter);
  app.use(adminRouter);
  app.use(breedsRouter);
  app.use(itemsOfficialRouter);
  app.use(quotesExploreRouter);
  app.use(quotesCreateRouter);
  app.use(quotesSeedRouter);
  app.use(salespeopleRouter);

  return app;
}
