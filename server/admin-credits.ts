#!/usr/bin/env tsx

/**
 * Admin script to set player credit points
 * Run with: npx tsx server/admin-credits.ts
 */

import { setPlayerCreditPoints } from './set-player-credits';

console.log("📊 Fantasy Cricket Admin - Player Credit Points Setup");
console.log("===================================================");
console.log();
console.log("This script will set the following credit points:");
console.log();
console.log("All Rounders:");
console.log("- Ankur: 200");
console.log("- Prince: 150");
console.log("- Mayank: 140");
console.log("- Amit: 150");
console.log();
console.log("Batsman:");
console.log("- Kuki: 160");
console.log("- Captain: 90");
console.log("- Chintu: 110");
console.log("- Paras Kumar: 90");
console.log("- Pushkar: 100");
console.log("- Dhilu: 55");
console.log("- Kamal: 110");
console.log("- Ajay: 35");
console.log();
console.log("Bowlers:");
console.log("- Pulkit: 55");
console.log("- Nitish: 110");
console.log("- Rahul: 110");
console.log("- Karambeer: 95");
console.log("- Manga: 90");
console.log();

// Run the function to set player credit points
setPlayerCreditPoints()
  .then(() => {
    console.log();
    console.log("✅ Credit points setup completed successfully!");
    process.exit(0);
  })
  .catch(error => {
    console.error("❌ Error setting credit points:", error);
    process.exit(1);
  });
