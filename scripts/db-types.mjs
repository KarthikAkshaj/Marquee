// Cross-platform wrapper for `supabase gen types` (SPEC §5).
// pnpm scripts don't expand $VARS on Windows, so the project ref is read here.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

function projectRef() {
  if (process.env.SUPABASE_PROJECT_ID) return process.env.SUPABASE_PROJECT_ID;
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    const match = readFileSync(file, "utf8").match(/^SUPABASE_PROJECT_ID=(.+)$/m);
    if (match) return match[1].trim();
  }
  return null;
}

const ref = projectRef();
if (!ref) {
  console.error("SUPABASE_PROJECT_ID is not set (checked env, .env.local, .env).");
  process.exit(1);
}

// Run the CLI's JS entry with this Node binary. Spawning the `supabase.cmd`
// shim directly fails on Windows (Node refuses .cmd files without a shell).
const require = createRequire(import.meta.url);
const pkgPath = require.resolve("supabase/package.json");
const cli = join(dirname(pkgPath), JSON.parse(readFileSync(pkgPath, "utf8")).bin.supabase);

const out = execFileSync(
  process.execPath,
  [cli, "gen", "types", "typescript", "--project-id", ref],
  { encoding: "utf8", maxBuffer: 32 * 1024 * 1024, stdio: ["ignore", "pipe", "inherit"] },
);

if (!out.trim()) {
  console.error("supabase returned nothing — run `pnpm exec supabase login` first.");
  process.exit(1);
}

writeFileSync("lib/supabase/database.types.ts", out);
console.log(`Wrote lib/supabase/database.types.ts (${out.split("\n").length} lines) for ${ref}`);
