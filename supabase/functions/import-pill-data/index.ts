import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RXIMAGE_BASE_URL = "https://rximage.nlm.nih.gov/api/rximage/1/rxnav";
const RXNORM_RXCUI_URL = "https://rxnav.nlm.nih.gov/REST/rxcui.json";
const DAILYMED_BASE_URL = "https://dailymed.nlm.nih.gov/dailymed/services/v2";
const MAX_IMPORT_LIMIT = 500;
const DEFAULT_IMPORT_LIMIT = 150;
const DEFAULT_ENRICH_LIMIT = 100;

type ImportSource = "rximage" | "dailymed";

type PillShape =
  | "round"
  | "oval"
  | "capsule"
  | "diamond"
  | "triangle"
  | "hexagon"
  | "rectangle"
  | "other";

type PillColor =
  | "white"
  | "blue"
  | "yellow"
  | "pink"
  | "green"
  | "orange"
  | "red"
  | "purple"
  | "gray"
  | "brown"
  | "tan"
  | "multicolor"
  | "other";

type RxCandidate = {
  drug_name: string;
  imprint: string;
  shape: PillShape;
  color: PillColor;
  notes: string | null;
  external_id: string | null;
  ndc_code: string | null;
  image_url: string | null;
};

type ExistingReference = {
  id: string;
  imprint: string;
  shape: PillShape;
  color: PillColor;
  source: string | null;
};

type ImportResult = {
  source: ImportSource;
  dryRun: boolean;
  category: string;
  limit: number;
  processed: number;
  inserted: number;
  updated: number;
  duplicatesSkipped: number;
  imagesAdded: number;
  enriched: number;
  apiErrors: number;
  completedAt: string;
};

const CATEGORY_TERMS: Record<string, string[]> = {
  opioids: ["oxycodone", "hydrocodone", "morphine", "tramadol", "codeine"],
  benzos: ["alprazolam", "diazepam", "clonazepam", "lorazepam", "temazepam"],
  stimulants: ["amphetamine", "methylphenidate", "modafinil", "dextroamphetamine"],
  antibiotics: ["amoxicillin", "azithromycin", "cephalexin", "ciprofloxacin", "doxycycline"],
  cardiovascular: ["atorvastatin", "lisinopril", "metoprolol", "amlodipine", "losartan"],
  diabetes: ["metformin", "glipizide", "jardiance", "sitagliptin"],
  psychiatric: ["sertraline", "fluoxetine", "bupropion", "escitalopram", "quetiapine"],
  gi: ["omeprazole", "pantoprazole", "famotidine", "ondansetron"],
  antihistamines: ["cetirizine", "loratadine", "fexofenadine", "diphenhydramine"],
  thyroid: ["levothyroxine"],
  muscle_relaxants: ["cyclobenzaprine", "methocarbamol", "tizanidine"],
  supplements: ["folic acid", "vitamin d", "iron", "potassium chloride"],
};

const SHAPE_ALIASES: Array<{ test: RegExp; value: PillShape }> = [
  { test: /round|circle|spherical/, value: "round" },
  { test: /oval|ellipse/, value: "oval" },
  { test: /capsule|oblong|caplet/, value: "capsule" },
  { test: /diamond|rhomb/, value: "diamond" },
  { test: /triangle|triangular/, value: "triangle" },
  { test: /hexagon|hexagonal/, value: "hexagon" },
  { test: /rectangle|rectangular|bar/, value: "rectangle" },
];

const COLOR_VALUES: PillColor[] = [
  "white",
  "blue",
  "yellow",
  "pink",
  "green",
  "orange",
  "red",
  "purple",
  "gray",
  "brown",
  "tan",
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function asString(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  if (typeof value === "number") return String(value);
  return null;
}

function firstString(source: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = source[key];

    if (typeof value === "string" && value.trim()) return value.trim();

    if (Array.isArray(value)) {
      for (const item of value) {
        const parsed = asString(item);
        if (parsed) return parsed;
      }
    }

    if (value && typeof value === "object") {
      const nested = value as Record<string, unknown>;
      const nestedValue = firstString(nested, ["name", "title", "value", key]);
      if (nestedValue) return nestedValue;
    }
  }
  return null;
}

function normalizeImprint(raw: string | null): string | null {
  if (!raw) return null;
  const normalized = raw.replace(/\s+/g, " ").trim().toUpperCase();
  return normalized.length > 0 ? normalized : null;
}

function normalizeShape(raw: string | null): PillShape {
  if (!raw) return "other";
  const value = raw.toLowerCase();
  const found = SHAPE_ALIASES.find((alias) => alias.test.test(value));
  return found?.value ?? "other";
}

function normalizeColor(raw: string | null): PillColor {
  if (!raw) return "other";
  const value = raw.toLowerCase();

  if (
    value.includes("/") ||
    value.includes(" and ") ||
    value.includes("-") ||
    value.includes("+") ||
    value.includes(",")
  ) {
    const uniqueMatches = COLOR_VALUES.filter((color) => value.includes(color));
    if (uniqueMatches.length > 1) return "multicolor";
  }

  const match = COLOR_VALUES.find((color) => value.includes(color));
  return match ?? "other";
}

function getDedupeKey(imprint: string, shape: PillShape, color: PillColor): string {
  return `${imprint.toLowerCase().replace(/\s+/g, "")}|${shape}|${color}`;
}

function getTermsForCategory(category: string): string[] {
  if (category === "all") {
    return [...new Set(Object.values(CATEGORY_TERMS).flat())];
  }
  return CATEGORY_TERMS[category] ?? CATEGORY_TERMS.opioids;
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Request failed [${response.status}] ${url}: ${body.slice(0, 400)}`);
  }

  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON response from ${url}`);
  }
}

function extractRxImageRows(payload: unknown): Record<string, unknown>[] {
  if (!payload || typeof payload !== "object") return [];

  const root = payload as Record<string, unknown>;
  const candidates = [
    root.nlmRxImages,
    root.rxImages,
    root.images,
    root.data,
    root.results,
    (root.data as Record<string, unknown> | undefined)?.nlmRxImages,
    (root.reply as Record<string, unknown> | undefined)?.nlmRxImages,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.filter((item): item is Record<string, unknown> => !!item && typeof item === "object");
    }
  }

  return [];
}

function mapRxRow(row: Record<string, unknown>, fallbackName: string): RxCandidate | null {
  const drugName =
    firstString(row, ["name", "rxstring", "rxterm", "drugName", "drug_name", "label"]) ?? fallbackName;
  const imprint = normalizeImprint(
    firstString(row, ["imprint", "splimprint", "imprintText", "imprint_text"]),
  );

  if (!drugName || !imprint) return null;

  const shape = normalizeShape(firstString(row, ["shape", "splshape", "shape_text"]));
  const color = normalizeColor(firstString(row, ["color", "splcolor", "color_text"]));
  const imageUrl = firstString(row, ["imageUrl", "image_url", "image", "url", "imageUrlFull", "fullImage"]);
  const ndcCode = firstString(row, ["ndc11", "ndc", "ndc_code"]);
  const externalId = firstString(row, ["id", "imageId", "rxcui", "rxnorm_id"]);

  const noteParts = [
    firstString(row, ["labeler", "manufacturer"]),
    firstString(row, ["strength", "dose"]),
    firstString(row, ["dosageForm", "dosage_form"]),
  ].filter(Boolean);

  return {
    drug_name: drugName,
    imprint,
    shape,
    color,
    notes: noteParts.length ? `RxImage: ${noteParts.join(" • ")}` : null,
    external_id: externalId,
    ndc_code: ndcCode,
    image_url: imageUrl,
  };
}

async function fetchRxImageCandidatesByTerm(term: string): Promise<RxCandidate[]> {
  const directPayload = await fetchJson(`${RXIMAGE_BASE_URL}?name=${encodeURIComponent(term)}`);
  let rows = extractRxImageRows(directPayload);

  if (rows.length === 0) {
    const rxNormPayload = await fetchJson(`${RXNORM_RXCUI_URL}?name=${encodeURIComponent(term)}`);
    const idGroup = (rxNormPayload as Record<string, unknown>)?.idGroup as Record<string, unknown> | undefined;
    const rxnormIds = (idGroup?.rxnormId as unknown[] | undefined)
      ?.map((id) => asString(id))
      .filter((id): id is string => !!id)
      .slice(0, 2) ?? [];

    for (const rxcui of rxnormIds) {
      const payload = await fetchJson(`${RXIMAGE_BASE_URL}?rxcui=${encodeURIComponent(rxcui)}`);
      const maybeRows = extractRxImageRows(payload);
      if (maybeRows.length > 0) {
        rows = rows.concat(maybeRows);
      }
    }
  }

  return rows
    .map((row) => mapRxRow(row, term))
    .filter((item): item is RxCandidate => !!item);
}

async function fetchAllExistingReferences(adminClient: ReturnType<typeof createClient>): Promise<ExistingReference[]> {
  const allRows: ExistingReference[] = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await adminClient
      .from("pill_reference")
      .select("id, imprint, shape, color, source")
      .range(from, from + pageSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    allRows.push(...(data as ExistingReference[]));

    if (data.length < pageSize) break;
    from += pageSize;
  }

  return allRows;
}

async function runRxImageImport(
  adminClient: ReturnType<typeof createClient>,
  category: string,
  limit: number,
  dryRun: boolean,
): Promise<ImportResult> {
  const terms = getTermsForCategory(category);
  const gathered: RxCandidate[] = [];
  let apiErrors = 0;

  for (const term of terms) {
    if (gathered.length >= limit) break;
    try {
      const items = await fetchRxImageCandidatesByTerm(term);
      gathered.push(...items);
    } catch (error) {
      apiErrors += 1;
      console.error(`RxImage fetch failed for term ${term}:`, error);
    }
    await sleep(1000);
  }

  const dedupedFromApi = new Map<string, RxCandidate>();
  for (const candidate of gathered) {
    const key = getDedupeKey(candidate.imprint, candidate.shape, candidate.color);
    if (!dedupedFromApi.has(key)) {
      dedupedFromApi.set(key, candidate);
    }
  }

  const existingRows = await fetchAllExistingReferences(adminClient);
  const existingByKey = new Map<string, ExistingReference>();
  for (const row of existingRows) {
    const normalized = normalizeImprint(row.imprint);
    if (!normalized) continue;
    existingByKey.set(getDedupeKey(normalized, row.shape, row.color), row);
  }

  let inserted = 0;
  let updated = 0;
  let duplicatesSkipped = 0;
  let imagesAdded = 0;
  let processed = 0;

  for (const [key, candidate] of dedupedFromApi.entries()) {
    if (processed >= limit) break;
    processed += 1;

    const existing = existingByKey.get(key);
    if (existing?.source === "manual") {
      duplicatesSkipped += 1;
      continue;
    }

    if (dryRun) {
      if (existing) updated += 1;
      else inserted += 1;
      continue;
    }

    let referenceId: string | null = null;

    if (existing) {
      const { error: updateError } = await adminClient
        .from("pill_reference")
        .update({
          drug_name: candidate.drug_name,
          imprint: candidate.imprint,
          shape: candidate.shape,
          color: candidate.color,
          notes: candidate.notes,
          source: "rximage",
          external_id: candidate.external_id,
          ndc_code: candidate.ndc_code,
          last_synced: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (updateError) {
        apiErrors += 1;
        console.error("Failed to update pill reference:", updateError);
        continue;
      }

      updated += 1;
      referenceId = existing.id;
    } else {
      const { data: insertedRow, error: insertError } = await adminClient
        .from("pill_reference")
        .insert({
          drug_name: candidate.drug_name,
          imprint: candidate.imprint,
          shape: candidate.shape,
          color: candidate.color,
          notes: candidate.notes,
          source: "rximage",
          external_id: candidate.external_id,
          ndc_code: candidate.ndc_code,
          last_synced: new Date().toISOString(),
        })
        .select("id, imprint, shape, color, source")
        .single();

      if (insertError || !insertedRow) {
        apiErrors += 1;
        console.error("Failed to insert pill reference:", insertError);
        continue;
      }

      inserted += 1;
      referenceId = insertedRow.id;
      existingByKey.set(key, insertedRow as ExistingReference);
    }

    if (candidate.image_url && referenceId) {
      const { error: imageError } = await adminClient.from("pill_reference_images").insert({
        pill_reference_id: referenceId,
        image_url: candidate.image_url,
        source: "rximage",
      });

      if (imageError) {
        apiErrors += 1;
        console.error("Failed to insert pill image:", imageError);
      } else {
        imagesAdded += 1;
      }
    }
  }

  return {
    source: "rximage",
    dryRun,
    category,
    limit,
    processed,
    inserted,
    updated,
    duplicatesSkipped,
    imagesAdded,
    enriched: 0,
    apiErrors,
    completedAt: new Date().toISOString(),
  };
}

function collectFirstRecord(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;

  const arrays = [root.data, root.spls, root.results];
  for (const array of arrays) {
    if (Array.isArray(array) && array.length > 0 && typeof array[0] === "object") {
      return array[0] as Record<string, unknown>;
    }
  }

  if (typeof root === "object" && root !== null && "setid" in root) {
    return root;
  }

  return null;
}

function buildDailyMedNote(record: Record<string, unknown>, detail: Record<string, unknown> | null): string | null {
  const manufacturer =
    firstString(record, ["labeler", "labeler_name", "manufacturer"]) ??
    (detail ? firstString(detail, ["labeler", "manufacturer", "manufacturer_name"]) : null);

  const dosage =
    firstString(record, ["dosage_form", "dosageForm"]) ??
    (detail ? firstString(detail, ["dosage_form", "dosageForm"]) : null);

  const route = firstString(record, ["route"]) ?? (detail ? firstString(detail, ["route"]) : null);

  const noteParts = [
    manufacturer ? `Manufacturer: ${manufacturer}` : null,
    dosage ? `Dosage: ${dosage}` : null,
    route ? `Route: ${route}` : null,
  ].filter(Boolean);

  if (noteParts.length === 0) return null;
  return `[DailyMed] ${noteParts.join(" • ")}`;
}

function mergeDailyMedNote(existingNotes: string | null, dailyMedLine: string | null): string | null {
  if (!dailyMedLine) return existingNotes;

  const withoutOld = (existingNotes ?? "")
    .split("\n")
    .filter((line) => !line.trim().toLowerCase().startsWith("[dailymed]"))
    .join("\n")
    .trim();

  return [withoutOld, dailyMedLine].filter(Boolean).join("\n");
}

async function runDailyMedEnrichment(
  adminClient: ReturnType<typeof createClient>,
  limit: number,
  dryRun: boolean,
): Promise<ImportResult> {
  const { data: references, error } = await adminClient
    .from("pill_reference")
    .select("id, drug_name, notes, ndc_code, source")
    .order("last_synced", { ascending: true, nullsFirst: true })
    .limit(limit);

  if (error) throw error;

  let processed = 0;
  let enriched = 0;
  let duplicatesSkipped = 0;
  let apiErrors = 0;

  for (const row of references ?? []) {
    processed += 1;

    try {
      const searchPayload = await fetchJson(
        `${DAILYMED_BASE_URL}/spls.json?drug_name=${encodeURIComponent(row.drug_name)}&pagesize=1`,
      );

      const firstRecord = collectFirstRecord(searchPayload);
      if (!firstRecord) {
        duplicatesSkipped += 1;
        continue;
      }

      const setId = firstString(firstRecord, ["setid", "set_id"]);
      let detailRecord: Record<string, unknown> | null = null;

      if (setId) {
        try {
          const detailsPayload = await fetchJson(`${DAILYMED_BASE_URL}/spls/${setId}.json`);
          detailRecord = collectFirstRecord(detailsPayload) ?? (detailsPayload as Record<string, unknown>);
        } catch (detailError) {
          apiErrors += 1;
          console.error(`DailyMed details fetch failed for ${setId}:`, detailError);
        }
      }

      const ndcCode =
        firstString(firstRecord, ["ndc", "ndc11", "product_ndc"]) ??
        (detailRecord ? firstString(detailRecord, ["ndc", "ndc11", "product_ndc"]) : null) ??
        row.ndc_code;

      const mergedNotes = mergeDailyMedNote(row.notes, buildDailyMedNote(firstRecord, detailRecord));
      const nextSource = row.source === "manual" || row.source === "rximage" ? row.source : "dailymed";

      if (!dryRun) {
        const { error: updateError } = await adminClient
          .from("pill_reference")
          .update({
            ndc_code: ndcCode,
            notes: mergedNotes,
            source: nextSource,
            last_synced: new Date().toISOString(),
          })
          .eq("id", row.id);

        if (updateError) {
          apiErrors += 1;
          console.error("DailyMed update failed:", updateError);
          continue;
        }
      }

      enriched += 1;
    } catch (fetchError) {
      apiErrors += 1;
      console.error(`DailyMed fetch failed for ${row.drug_name}:`, fetchError);
    }

    await sleep(500);
  }

  return {
    source: "dailymed",
    dryRun,
    category: "enrichment",
    limit,
    processed,
    inserted: 0,
    updated: 0,
    duplicatesSkipped,
    imagesAdded: 0,
    enriched,
    apiErrors,
    completedAt: new Date().toISOString(),
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl) throw new Error("SUPABASE_URL is not configured");
    if (!supabaseAnonKey) throw new Error("SUPABASE_ANON_KEY is not configured");
    if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    const userId = user?.id;

    if (userError || !userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin, error: roleError } = await userClient.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });

    if (roleError || !isAdmin) {
      return new Response(JSON.stringify({ error: "Admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const source = body?.source as ImportSource;
    const dryRun = Boolean(body?.dryRun);

    if (source !== "rximage" && source !== "dailymed") {
      return new Response(JSON.stringify({ error: "Invalid source. Use 'rximage' or 'dailymed'." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const category = typeof body?.category === "string" ? body.category : "opioids";
    const limit = clamp(Number(body?.limit ?? DEFAULT_IMPORT_LIMIT), 1, MAX_IMPORT_LIMIT);
    const enrichLimit = clamp(Number(body?.enrichLimit ?? DEFAULT_ENRICH_LIMIT), 1, MAX_IMPORT_LIMIT);

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const result =
      source === "rximage"
        ? await runRxImageImport(adminClient, category, limit, dryRun)
        : await runDailyMedEnrichment(adminClient, enrichLimit, dryRun);

    return new Response(
      JSON.stringify({
        ...result,
        supportedCategories: ["all", ...Object.keys(CATEGORY_TERMS)],
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("import-pill-data error:", error);

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
