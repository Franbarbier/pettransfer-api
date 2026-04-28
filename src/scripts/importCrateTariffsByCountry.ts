import "dotenv/config";
import { getPool, requireDatabaseUrl } from "../database/pool";
import rawJson from "../database/usefuljsons/info/crate_tariffs_by_country.json";

type JsonItem = {
  id: string;
  size_code: string;
  pet_scope: string;
  measures_cm: string | null;
  weight_vol_kg: string | null;
  cost_amount: number | null;
  cost_currency: string;
  cost_label?: string;
  notes: string | null;
};

async function main() {
  requireDatabaseUrl();
  const pool = getPool();

  const countries = (rawJson as { countries: Record<string, JsonItem[]> }).countries;
  let total = 0;

  for (const [country, items] of Object.entries(countries)) {
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await pool.query(
        `INSERT INTO crate_tariffs_by_country
           (id, country, size_code, pet_scope, measures_cm, weight_vol_kg,
            cost_amount, cost_currency, cost_label, notes, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (id) DO UPDATE SET
           country       = EXCLUDED.country,
           size_code     = EXCLUDED.size_code,
           pet_scope     = EXCLUDED.pet_scope,
           measures_cm   = EXCLUDED.measures_cm,
           weight_vol_kg = EXCLUDED.weight_vol_kg,
           cost_amount   = EXCLUDED.cost_amount,
           cost_currency = EXCLUDED.cost_currency,
           cost_label    = EXCLUDED.cost_label,
           notes         = EXCLUDED.notes,
           sort_order    = EXCLUDED.sort_order,
           updated_at    = now()`,
        [
          item.id,
          country,
          item.size_code,
          item.pet_scope,
          item.measures_cm ?? null,
          item.weight_vol_kg ?? null,
          item.cost_amount ?? null,
          item.cost_currency ?? "USD",
          item.cost_label ?? null,
          item.notes ?? null,
          (i + 1) * 10,
        ],
      );
      total++;
    }
    console.log(`  ${country}: ${items.length} rows`);
  }

  console.log(`\nTotal upserted: ${total} rows`);
  await pool.end();
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
