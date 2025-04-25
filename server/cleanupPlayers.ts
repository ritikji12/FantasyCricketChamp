
import { storage } from "./storage";

export async function cleanupDuplicatePlayers() {
  console.log("Starting player cleanup...");
  
  // Get all players
  const players = await storage.getPlayers();
  console.log(`Found ${players.length} total players`);
  
  // Create a map to track unique players by name
  const uniquePlayersMap = new Map();
  const duplicates: number[] = [];
  
  // Find duplicates
  players.forEach(player => {
    if (uniquePlayersMap.has(player.name)) {
      duplicates.push(player.id);
    } else {
      uniquePlayersMap.set(player.name, player);
    }
  });

  console.log(`Found ${duplicates.length} duplicate players`);

  // Delete duplicate players
  for (const id of duplicates) {
    try {
      await storage.deletePlayer(id);
      console.log(`Deleted duplicate player with ID: ${id}`);
    } catch (error) {
      console.error(`Failed to delete player ${id}:`, error);
    }
  }

  console.log("Player cleanup complete");
}
