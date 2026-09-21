"use server";

import { createClient } from "@/lib/supabase/server";

export interface InsertLeadsResult {
  insertedIds: string[];
  duplicates: number;
  errors: string[];
}

/**
 * Insert lead rows one at a time, treating unique-constraint violations as
 * duplicates (the fp_domain / fp_phone / fp_name_city / fp_name_address
 * partial indexes enforce global dedupe in the database). Unrelated errors
 * are collected and returned, so one bad row never aborts the whole batch.
 */
export async function insertLeadsDedupe(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: Array<Record<string, unknown>>
): Promise<InsertLeadsResult> {
  const result: InsertLeadsResult = { insertedIds: [], duplicates: 0, errors: [] };
  for (const row of rows) {
    const { data, error } = await supabase.from("leads").insert(row).select("id");
    if (error) {
      if (/duplicate key value violates unique constraint/i.test(error.message)) {
        result.duplicates++;
        continue;
      }
      result.errors.push(error.message);
      continue;
    }
    if (data?.[0]?.id) result.insertedIds.push(String(data[0].id));
  }
  return result;
}