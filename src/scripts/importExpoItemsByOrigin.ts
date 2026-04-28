import "dotenv/config";
import { getPool, requireDatabaseUrl } from "../database/pool";
import rawJson from "../database/usefuljsons/info/latam_profit_transport_by_country.json";

type CountryBundle = {
  label: string;
  notes?: string[];
  items: Record<string, string>[];
};

async function main() {
  requireDatabaseUrl();
  const pool = getPool();

  const countries = ((rawJson as unknown) as { countries: Record<string, CountryBundle> }).countries;
  let itemCount = 0;

  for (const [i, [country, bundle]] of Object.entries(Object.entries(countries))) {
    const label = bundle.label ?? country;
    const notes = Array.isArray(bundle.notes) ? bundle.notes : [];

    await pool.query(
      `INSERT INTO expo_origins (country, label, notes, sort_order)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (country) DO UPDATE SET
         label      = EXCLUDED.label,
         notes      = EXCLUDED.notes,
         sort_order = EXCLUDED.sort_order,
         updated_at = now()`,
      [country, label, notes, (parseInt(i, 10) + 1) * 10],
    );

    const items = Array.isArray(bundle.items) ? bundle.items : [];
    for (let j = 0; j < items.length; j++) {
      const entry = items[j];
      if (!entry || typeof entry !== "object") continue;
      for (const [itemKey, valueText] of Object.entries(entry)) {
        if (typeof valueText !== "string") continue;
        await pool.query(
          `INSERT INTO expo_items_by_origin (country, item_key, note, sort_order)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (country, item_key) DO UPDATE SET
             note = EXCLUDED.note,
             sort_order = EXCLUDED.sort_order,
             updated_at = now()`,
          [country, itemKey, valueText, (j + 1) * 10],
        );
        itemCount++;
      }
    }

    console.log(`  ${country}: ${items.length} items`);
  }

  console.log(`\nTotal: ${itemCount} items upserted`);
  await pool.end();
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
