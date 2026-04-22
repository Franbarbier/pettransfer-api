import cors from "cors";
import express from "express";
import { healthRouter } from "../controllers/health.controller";
import { quotesExploreRouter } from "../controllers/quotesExplore.controller";
import { quotesSeedRouter } from "../controllers/quotesSeed.controller";
import { salespeopleRouter } from "../controllers/salespeople.controller";
import { settings } from "../settings";

export function createApp(): express.Express {
  const app = express();

  app.use(express.json());
  app.use(
    cors({
      origin: settings.CORS_ORIGIN,
      credentials: true,
    }),
  );

  app.use(healthRouter);
  app.use(quotesExploreRouter);
  app.use(quotesSeedRouter);
  app.use(salespeopleRouter);

  return app;
}
