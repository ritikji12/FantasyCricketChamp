/**
 * Set player credit points script
 * Designed for Render's one-off jobs
 */

const { Pool } = require('pg');

// Create database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for some Postgres services on Render
  }
});

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
async function setPlayerCreditPoints() {
  let client;
  
  try {
    console.log("Starting to set player credit points...");
    
    client = await pool.connect();
    
    // Get all players
    const allPlayersResult = await client.query('SELECT id, name FROM players');
    const allPlayers = allPlayersResult.rows;
    
    let updatedCount = 0;
    let skippedCount = 0;
    
    // Process each player
    for (const player of allPlayers) {
      // Check if we have a credit point value for this player
      if (player.name in playerCreditPoints) {
        const creditPoints = playerCreditPoints[player.name];
        
        // Update the player's credit points
        await client.query(
          'UPDATE players SET credit_points = $1 WHERE id = $2',
          [creditPoints, player.id]
        );
        
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
  } finally {
    if (client) {
      client.release();
    }
    
    // Close the pool to ensure script exits
    await pool.end();
  }
}

// Execute the function
setPlayerCreditPoints()
  .then(() => {
    console.log("Credit points setup complete!");
    process.exit(0);
  })
  .catch(err => {
    console.error("Error:", err);
    process.exit(1);
  });
