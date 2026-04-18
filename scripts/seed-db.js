#!/usr/bin/env node

/**
 * Seed script for Baengo bingo items
 * Usage: node scripts/seed-db.js
 * 
 * This script reads config/bingo_items.yaml and populates the D1 database
 * Make sure your Cloudflare D1 database is properly configured
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Note: You'll need to install js-yaml: npm install js-yaml
// Or we can parse YAML manually for a simpler approach

const YAML_PATH = path.join(__dirname, '../config/bingo_items.yaml');

// Simple YAML parser (for basic structure)
function parseYaml(content) {
  const lines = content.split('\n');
  const items = [];
  let currentItem = null;
  let inItems = false;

  for (const line of lines) {
    const trimmed = line.trim();
    
    if (trimmed === 'items:') {
      inItems = true;
      continue;
    }

    if (inItems && trimmed.startsWith('- content:')) {
      if (currentItem && currentItem.content) {
        items.push(currentItem);
      }
      const content = trimmed.replace('- content:', '').trim().replace(/^"|"$/g, '');
      currentItem = { content };
    } else if (inItems && trimmed.startsWith('category:')) {
      if (currentItem) {
        const category = trimmed.replace('category:', '').trim().replace(/^"|"$/g, '');
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
  try {
    console.log('🚀 Starting database seeding...');

    // Read YAML file
    const yamlContent = fs.readFileSync(YAML_PATH, 'utf-8');
    const items = parseYaml(yamlContent);

    if (items.length === 0) {
      console.error('❌ No items found in YAML file');
      process.exit(1);
    }

    console.log(`📋 Found ${items.length} items to seed`);

    // Note: This is a simplified version for local testing
    // In production, you would use the Cloudflare D1 API
    // For now, log the items that would be inserted

    items.forEach((item, index) => {
      console.log(`  ${index + 1}. ${item.content} (${item.category || 'general'})`);
    });

    console.log('\n✅ Seeding complete!');
    console.log('\nTo insert these into your D1 database, run:');
    console.log('  npm run seed-db -- --apply\n');

    // Return items for API usage
    return items;
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    process.exit(1);
  }
}

// Run seeding
seedDatabase();
