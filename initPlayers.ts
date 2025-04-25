import { storage } from "./storage";

import { cleanupDuplicatePlayers } from "./cleanupPlayers";

// Function to initialize players
export async function initializePlayers() {
  // Clean up duplicates first
  await cleanupDuplicatePlayers();
  
  console.log("Initializing players...");
  
  // Force reinitialization
  const existingPlayers = await storage.getPlayers();
  console.log(`Found ${existingPlayers.length} existing players.`);
  
  // All Rounders
  const allRounders = [
    { name: "Ankur", type: "all_rounders", creditPoints: 200 },
    { name: "Prince", type: "all_rounders", creditPoints: 150 },
    { name: "Mayank", type: "all_rounders", creditPoints: 140 },
    { name: "Amit", type: "all_rounders", creditPoints: 150 },
  ];
  
  // Batsmen
  const batsmen = [
    { name: "Kuki", type: "batsmen", creditPoints: 160 },
    { name: "Captain", type: "batsmen", creditPoints: 90 },
    { name: "Chintu", type: "batsmen", creditPoints: 110 },
    { name: "Paras Kumar", type: "batsmen", creditPoints: 90 },
    { name: "Pushkar", type: "batsmen", creditPoints: 100 },
    { name: "Dhilu", type: "batsmen", creditPoints: 55 },
    { name: "Kamal", type: "batsmen", creditPoints: 110 },
    { name: "Ajay", type: "batsmen", creditPoints: 35 },
  ];
  
  // Bowlers
  const bowlers = [
    { name: "Pulkit", type: "bowlers", creditPoints: 55 },
    { name: "Nitish", type: "bowlers", creditPoints: 110 },
    { name: "Rahul", type: "bowlers", creditPoints: 110 },
    { name: "Karambeer", type: "bowlers", creditPoints: 95 },
    { name: "Manga", type: "bowlers", creditPoints: 90 },
  ];
  
  // Wicket Keepers - Create at least one dummy wicket keeper
  const wicketKeepers = [
    { name: "Rahul (WK)", type: "wicket_keepers", creditPoints: 120 },
  ];
  
  // Combine all players
  const allPlayers = [...allRounders, ...batsmen, ...bowlers, ...wicketKeepers];
  
  // Create each player in the database
  for (const player of allPlayers) {
    try {
      await storage.createPlayer(player);
      console.log(`Created player: ${player.name} (${player.type})`);
    } catch (error) {
      console.error(`Failed to create player ${player.name}:`, error);
    }
  }
  
  console.log("Player initialization complete.");
}
