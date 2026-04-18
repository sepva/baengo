#!/usr/bin/env node

/**
 * Seed script for Baengo bingo items
 * Usage: npm run seed-db
 *
 * This script reads config/bingo_items.yaml and generates SQL INSERT statements,
 * then runs them against the D1 database via wrangler CLI.
 *
 * Prerequisites:
 *   - wrangler must be installed and authenticated
 *   - database_id must be set in wrangler.toml
 *
 * To seed a LOCAL dev database:     node scripts/seed-db.js --local
 * To seed the PRODUCTION database:  node scripts/seed-db.js
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const YAML_PATH = path.join(__dirname, "../config/bingo_items.yaml");

// Simple YAML parser (for basic structure)
function parseYaml(content) {
  const lines = content.split("\n");
  const items = [];
  let currentItem = null;
  let inItems = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "items:") {
      inItems = true;
      continue;
    }

    if (inItems && trimmed.startsWith("- content:")) {
      if (currentItem && currentItem.content) {
        items.push(currentItem);
      }
      const content = trimmed
        .replace("- content:", "")
        .trim()
        .replace(/^"|"$/g, "");
      currentItem = { content };
    } else if (inItems && trimmed.startsWith("category:")) {
      if (currentItem) {
        const category = trimmed
          .replace("category:", "")
          .trim()
          .replace(/^"|"$/g, "");
        currentItem.category = category;
      }
    }
  }

  if (currentItem && currentItem.content) {
    items.push(currentItem);
  }

  return items;
}

async function seedDatabase() {
  const isLocal = process.argv.includes("--local");
  const dryRun = process.argv.includes("--dry-run");

  try {
    console.log("🚀 Starting database seeding...");

    // Read YAML file
    const yamlContent = fs.readFileSync(YAML_PATH, "utf-8");
    const items = parseYaml(yamlContent);

    if (items.length === 0) {
      console.error("❌ No items found in YAML file");
      process.exit(1);
    }

    console.log(`📋 Found ${items.length} items to seed`);

    // Build SQL insert statements
    const now = new Date().toISOString();
    const sqlStatements = [
      "DELETE FROM baengo_items;", // Clear existing items first
      ...items.map((item) => {
        const content = item.content.replace(/'/g, "''"); // Escape single quotes
        const category = (item.category || "general").replace(/'/g, "''");
        return `INSERT INTO baengo_items (content, category, created_at) VALUES ('${content}', '${category}', '${now}');`;
      }),
    ];

    if (dryRun) {
      console.log("\n📝 SQL (dry run):");
      sqlStatements.forEach((stmt) => console.log(" ", stmt));
      console.log("\nRun without --dry-run to apply.");
      return;
    }

    // Write SQL to temp file and execute via wrangler
    const tmpFile = path.join(__dirname, "_seed_tmp.sql");
    fs.writeFileSync(tmpFile, sqlStatements.join("\n"));

    try {
      const localFlag = isLocal ? "--local" : "--remote";
      const cmd = `npx wrangler d1 execute baengo-db ${localFlag} --file=${tmpFile}`;
      console.log(`\nRunning: ${cmd}\n`);
      execSync(cmd, { stdio: "inherit", cwd: path.join(__dirname, "..") });
      console.log("\n✅ Seeding complete!");
    } finally {
      fs.unlinkSync(tmpFile);
    }
  } catch (error) {
    console.error("❌ Seeding failed:", error.message);
    process.exit(1);
  }
}

// Run seeding
seedDatabase();
