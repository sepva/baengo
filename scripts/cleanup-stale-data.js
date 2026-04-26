#!/usr/bin/env node

/**
 * Cleanup script for stale Baengo data.
 *
 * Defaults:
 * - Delete grids and completed-row records older than 7 days.
 * - Delete refresh tokens that are expired.
 *
 * Usage:
 *   npm run cleanup-db
 *   npm run cleanup-db -- --dry-run
 *   npm run cleanup-db -- --local
 *   npm run cleanup-db -- --grid-retention-days=10
 *   npm run cleanup-db -- --env=production
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execSync } = require("child_process");

const DEFAULT_DB_NAME = "baengo-db";
const DEFAULT_GRID_RETENTION_DAYS = 7;

function parseArgs(argv) {
  const args = {
    isLocal: false,
    dryRun: false,
    gridRetentionDays: DEFAULT_GRID_RETENTION_DAYS,
    dbName: DEFAULT_DB_NAME,
    environment: null,
  };

  for (const arg of argv) {
    if (arg === "--local") {
      args.isLocal = true;
      continue;
    }

    if (arg === "--remote") {
      args.isLocal = false;
      continue;
    }

    if (arg === "--dry-run") {
      args.dryRun = true;
      continue;
    }

    if (arg.startsWith("--grid-retention-days=")) {
      const value = Number(arg.split("=")[1]);
      if (!Number.isInteger(value) || value < 1 || value > 3650) {
        throw new Error(
          "--grid-retention-days must be an integer between 1 and 3650",
        );
      }
      args.gridRetentionDays = value;
      continue;
    }

    if (arg.startsWith("--db=")) {
      const value = arg.split("=")[1];
      if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
        throw new Error(
          "--db must contain only letters, numbers, underscores, or hyphens",
        );
      }
      args.dbName = value;
      continue;
    }

    if (arg.startsWith("--env=")) {
      const value = arg.split("=")[1];
      if (!/^[a-zA-Z0-9_-]+$/.test(value)) {
        throw new Error(
          "--env must contain only letters, numbers, underscores, or hyphens",
        );
      }
      args.environment = value;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return args;
}

function gridDateToDateExpression(columnName) {
  return `(
    CASE
      WHEN ${columnName} LIKE 'week-%' THEN date(substr(${columnName}, 6))
      ELSE date(${columnName})
    END
  )`;
}

function staleGridPredicate(days, tableAlias) {
  const dateExpr = gridDateToDateExpression(`${tableAlias}.grid_date`);
  return `(
    ${dateExpr} < date('now', '-${days} day')
    OR (
      ${dateExpr} IS NULL
      AND date(${tableAlias}.created_at) < date('now', '-${days} day')
    )
  )`;
}

function staleCompletedRowsPredicate(days, tableAlias) {
  const dateExpr = gridDateToDateExpression(`${tableAlias}.grid_date`);
  return `(
    ${dateExpr} < date('now', '-${days} day')
    OR (
      ${dateExpr} IS NULL
      AND date(${tableAlias}.created_at) < date('now', '-${days} day')
    )
  )`;
}

function expiredRefreshTokenPredicate(tableAlias) {
  return `(
    datetime(${tableAlias}.expires_at) < datetime('now')
    OR (
      datetime(${tableAlias}.expires_at) IS NULL
      AND datetime(${tableAlias}.created_at) < datetime('now')
    )
  )`;
}

function buildCountSql(gridRetentionDays) {
  const staleGridWhere = staleGridPredicate(gridRetentionDays, "dg");
  const staleCompletedWhere = staleCompletedRowsPredicate(
    gridRetentionDays,
    "cr",
  );
  const expiredRefreshWhere = expiredRefreshTokenPredicate("rt");

  return `
-- Preview how much data is eligible for cleanup
SELECT 'stale_daily_grids' AS metric, COUNT(*) AS total
FROM daily_grids dg
WHERE ${staleGridWhere};

SELECT 'stale_completed_rows' AS metric, COUNT(*) AS total
FROM completed_rows cr
WHERE ${staleCompletedWhere};

SELECT 'orphan_completed_rows' AS metric, COUNT(*) AS total
FROM completed_rows cr
WHERE NOT EXISTS (
  SELECT 1
  FROM daily_grids dg
  WHERE dg.user_id = cr.user_id
    AND dg.grid_date = cr.grid_date
);

SELECT 'expired_refresh_tokens' AS metric, COUNT(*) AS total
FROM refresh_tokens rt
WHERE ${expiredRefreshWhere};
`.trim();
}

function buildCleanupSql(gridRetentionDays) {
  const staleGridWhere = staleGridPredicate(gridRetentionDays, "dg");
  const staleCompletedWhere = staleCompletedRowsPredicate(
    gridRetentionDays,
    "cr",
  );
  const expiredRefreshWhere = expiredRefreshTokenPredicate("rt");

  return `
PRAGMA foreign_keys = ON;
BEGIN TRANSACTION;

-- Remove completed rows that no longer have a matching grid.
DELETE FROM completed_rows
WHERE NOT EXISTS (
  SELECT 1
  FROM daily_grids dg
  WHERE dg.user_id = completed_rows.user_id
    AND dg.grid_date = completed_rows.grid_date
);

-- Remove stale completed rows.
DELETE FROM completed_rows cr
WHERE ${staleCompletedWhere};

-- Remove stale grids.
DELETE FROM daily_grids dg
WHERE ${staleGridWhere};

-- Remove expired refresh tokens.
DELETE FROM refresh_tokens rt
WHERE ${expiredRefreshWhere};

COMMIT;
`.trim();
}

function runWranglerD1Execute({
  sql,
  dbName,
  isLocal,
  environment,
  workspaceRoot,
}) {
  const tempFilePath = path.join(
    os.tmpdir(),
    `baengo_cleanup_${Date.now()}_${Math.random().toString(36).slice(2)}.sql`,
  );

  try {
    fs.writeFileSync(tempFilePath, sql, "utf8");
    const scopeFlag = isLocal ? "--local" : "--remote";
    const envFlag = environment ? ` --env=${environment}` : "";
    const cmd = `npx wrangler d1 execute ${dbName} ${scopeFlag}${envFlag} --file=${tempFilePath}`;
    execSync(cmd, { stdio: "inherit", cwd: workspaceRoot });
  } finally {
    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const workspaceRoot = path.join(__dirname, "..");

  console.log("Starting stale-data cleanup");
  console.log(`Database: ${options.dbName}`);
  console.log(`Target: ${options.isLocal ? "local" : "remote"}`);
  if (options.environment) {
    console.log(`Environment: ${options.environment}`);
  }
  console.log(`Grid retention days: ${options.gridRetentionDays}`);
  console.log(`Dry run: ${options.dryRun ? "yes" : "no"}`);

  const countSql = buildCountSql(options.gridRetentionDays);
  console.log("\nPreview counts:");
  runWranglerD1Execute({
    sql: countSql,
    dbName: options.dbName,
    isLocal: options.isLocal,
    environment: options.environment,
    workspaceRoot,
  });

  if (options.dryRun) {
    console.log("\nDry run complete. No rows were deleted.");
    return;
  }

  const cleanupSql = buildCleanupSql(options.gridRetentionDays);
  console.log("\nExecuting cleanup...");
  runWranglerD1Execute({
    sql: cleanupSql,
    dbName: options.dbName,
    isLocal: options.isLocal,
    environment: options.environment,
    workspaceRoot,
  });

  console.log("\nPost-cleanup counts:");
  runWranglerD1Execute({
    sql: countSql,
    dbName: options.dbName,
    isLocal: options.isLocal,
    environment: options.environment,
    workspaceRoot,
  });

  console.log("\nCleanup finished successfully.");
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Cleanup failed: ${message}`);
  process.exit(1);
}
