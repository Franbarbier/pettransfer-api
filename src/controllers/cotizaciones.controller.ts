import archiver from "archiver";
import type { Request, Response } from "express";
import { Router } from "express";
import { gatherCotizacionesZipEntries } from "../services/driveCotizacionesZip.service";
import { settings } from "../settings";

export const cotizacionesRouter = Router();

async function getCotizacionesZip(req: Request, res: Response): Promise<void> {
  const rootFolderId =
    (typeof req.query.rootFolderId === "string" && req.query.rootFolderId.trim()) ||
    settings.DRIVE_COTIZACIONES_ROOT_FOLDER_ID?.trim();

  const credentialsPath = settings.GOOGLE_APPLICATION_CREDENTIALS?.trim();

  if (!credentialsPath || !rootFolderId) {
    res.status(400).json({
      error:
        "Configurá GOOGLE_APPLICATION_CREDENTIALS y DRIVE_COTIZACIONES_ROOT_FOLDER_ID, o pasá ?rootFolderId=.",
    });
    return;
  }

  try {
    const entries = await gatherCotizacionesZipEntries(
      credentialsPath,
      rootFolderId,
    );

    if (entries.length === 0) {
      res.status(404).json({
        error:
          "No hay archivos que cumplan la regla (cot impo / cot expo, Excel o PDF).",
      });
      return;
    }

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="cotizaciones.zip"',
    );

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.on("error", (err: Error) => {
      if (!res.headersSent) {
        res.status(500).json({ error: err.message });
      }
    });

    archive.pipe(res);

    for (const e of entries) {
      archive.append(e.buffer, { name: e.path });
    }

    await archive.finalize();
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    if (!res.headersSent) {
      res.status(500).json({ error: message });
    }
  }
}

cotizacionesRouter.get("/drive/cotizaciones-zip", (req, res) => {
  void getCotizacionesZip(req, res).catch((err: unknown) => {
    if (!res.headersSent) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: message });
    }
  });
});
