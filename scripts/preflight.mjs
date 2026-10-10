#!/usr/bin/env node
/**
 * Preflight gate for the production start command.
 *
 * Runs before `prisma db push` so a misconfigured deploy fails immediately
 * with one readable message in the deploy log, instead of an opaque Prisma
 * error or an endless Railway crash loop.
 */

import { accessSync, constants, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const ok = (m) => console.log(`[preflight] ${m}`);
const warn = (m) => console.warn(`[preflight] WARNING: ${m}`);
const die = (m) => {
  console.error(`\n[preflight] FATAL: ${m}\n`);
  process.exit(1);
};

const isProduction = process.env.NODE_ENV === "production";

/* ---------------------------------------------------------------- 1. exists */
const raw = (process.env.DATABASE_URL || "").trim();

if (!raw) {
  die(
    [
      "DATABASE_URL is not set, so the app has no database to open.",
      "",
      "This is the #1 cause of a Railway crash loop. Fix it in the dashboard:",
      "  1. Service -> Settings  -> Volume   -> add a Volume, mount path /data",
      "  2. Service -> Variables -> DATABASE_URL = file:/data/library.db",
      "  3. Redeploy",
      "",
      "Local development: copy .env.example to .env (DATABASE_URL=\"file:./dev.db\").",
    ].join("\n"),
  );
}

/* ------------------------------------------------- 2. non-SQLite is fine as-is */
if (!raw.toLowerCase().startsWith("file:")) {
  const scheme = raw.split(":")[0];
  ok(`DATABASE_URL uses ${scheme} — skipping SQLite filesystem checks.`);
  process.exit(0);
}

/* ------------------------------------------------------- 3. resolve the path */
let dbPath = raw.slice("file:".length).replace(/^\/{2,3}/, "/");

// file:./dev.db and file:prisma/dev.db are relative; file:/data/x.db and
// file:C:/data/x.db are absolute.
const isAbsolute = /^(?:\/|\\|[a-zA-Z]:[\\/])/.test(dbPath);

if (!isAbsolute) {
  if (isProduction) {
    die(
      [
        `DATABASE_URL is relative ("${raw}"), which resolves inside the build output.`,
        "",
        "Every deploy, restart or scale-event deletes that file, so the database",
        "would silently reset each time. Use an absolute path on a mounted Volume:",
        "  DATABASE_URL=file:/data/library.db    (Volume mounted at /data)",
      ].join("\n"),
    );
  }
  ok(`relative database path "${dbPath}" — correct for local development.`);
  process.exit(0);
}

/* --------------------------------------------- 4. make sure we can write it */
const dir = dirname(dbPath);
const dirExisted = existsSync(dir);

try {
  mkdirSync(dir, { recursive: true });
  accessSync(dir, constants.W_OK);
} catch (err) {
  die(
    [
      `Cannot write to "${dir}" (${err.code || err.message}).`,
      "",
      "On Railway this means the directory is not a mounted Volume.",
      "Add one under Service -> Settings -> Volume, mount path /data.",
    ].join("\n"),
  );
}

/* -------------------------------- 5. warn when persistence is probably absent */
if (isProduction && !dirExisted) {
  warn(
    `we just created "${dir}" ourselves. If that path is not a mounted Volume, ` +
      "the database will be wiped on the next deploy.",
  );
}

ok(`database "${dbPath}" is reachable and writable.`);
