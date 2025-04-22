import { db } from './db';
import { players } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Credit points configuration
const playerCreditPoints = {
  // All Rounders
  'Ankur': 200,
  'Prince': 150,
  'Mayank': 140,
  'Amit': 150,
  
  // Batsman
  'Kuki': 160,
  'Captain': 90,
  'Chintu': 110,
  'Paras Kumar': 90,
  'Pushkar': 100,
  'Dhilu': 55,
  'Kamal': 110,
  'Ajay': 35,
  
  // Bowlers
  'Pulkit': 55,
  'Nitish': 110,
  'Rahul': 110,
  'Karambeer': 95,
  'Manga': 90
};

/**
 * Set credit points for players based on the predefined configuration
 */
export async function setPlayerCreditPoints() {
  try {
    console.log("Starting to set player credit points...");
    
    // Get all players
    const allPlayers = await db.select().from(players);
    let updatedCount = 0;
    let skippedCount = 0;
    
    // Process each player
    for (const player of allPlayers) {
      // Check if we have a credit point value for this player
      if (player.name in playerCreditPoints) {
        const creditPoints = playerCreditPoints[player.name as keyof typeof playerCreditPoints];
        
        // Update the player's credit points
        await db
          .update(players)
          .set({ creditPoints: creditPoints })
          .where(eq(players.id, player.id));
        
        console.log(`Updated ${player.name} with ${creditPoints} credit points`);
        updatedCount++;
      } else {
        console.log(`Skipping ${player.name} - no credit points defined`);
        skippedCount++;
      }
    }
    
    console.log(`Completed setting player credit points.`);
    console.log(`Updated: ${updatedCount} players`);
    console.log(`Skipped: ${skippedCount} players`);
  } catch (error) {
    console.error("Error setting player credit points:", error);
    throw error;
  }
}

// Execute the function if this script is run directly
if (require.main === module) {
  setPlayerCreditPoints()
    .then(() => {
      console.log("Credit points setup complete!");
      process.exit(0);
    })
    .catch(err => {
      console.error("Error:", err);
      process.exit(1);
    });
}
