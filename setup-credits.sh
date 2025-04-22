#!/bin/bash

# Script to set up player credit points

echo "Fantasy Cricket Championship - Player Credit Points Setup"
echo "========================================================"
echo ""
echo "This script will set up the credit points for all players according to the predefined values."
echo ""
echo "Credit Points Configuration:"
echo "----------------------------"
echo "All Rounders:"
echo "- Ankur: 200"
echo "- Prince: 150"
echo "- Mayank: 140"
echo "- Amit: 150"
echo ""
echo "Batsman:"
echo "- Kuki: 160"
echo "- Captain: 90"
echo "- Chintu: 110"
echo "- Paras Kumar: 90"
echo "- Pushkar: 100"
echo "- Dhilu: 55"
echo "- Kamal: 110"
echo "- Ajay: 35"
echo ""
echo "Bowlers:"
echo "- Pulkit: 55"
echo "- Nitish: 110"
echo "- Rahul: 110"
echo "- Karambeer: 95"
echo "- Manga: 90"
echo ""
echo "Running script..."

# Run the TypeScript file using tsx
npx tsx server/admin-credits.ts

echo ""
echo "Setup complete!"
