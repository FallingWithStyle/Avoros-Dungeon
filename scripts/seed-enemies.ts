
import { db } from "../server/db";
import { enemies } from "../shared/schema";

const enemyData = [
  // Basic creatures
  { name: "Wandering Soul", description: "A lost spirit roaming the halls", rarity: "common", health: 25, attack: 8, defense: 3, speed: 5, creditsReward: 10, experienceReward: 15, minFloor: 1, maxFloor: 3 },
  { name: "Cave Rat", description: "A large rodent adapted to dungeon life", rarity: "common", health: 15, attack: 5, defense: 2, speed: 8, creditsReward: 5, experienceReward: 10, minFloor: 1, maxFloor: 2 },
  { name: "Skeleton Warrior", description: "Animated bones of a fallen soldier", rarity: "common", health: 30, attack: 12, defense: 8, speed: 4, creditsReward: 20, experienceReward: 25, minFloor: 1, maxFloor: 5 },
  
  // Faction-specific enemies
  { name: "Legion Soldier", description: "A disciplined Iron Legion warrior", rarity: "uncommon", health: 45, attack: 15, defense: 12, speed: 6, creditsReward: 35, experienceReward: 40, minFloor: 1, maxFloor: 10 },
  { name: "Legion Knight", description: "An elite Iron Legion knight in full armor", rarity: "rare", health: 80, attack: 20, defense: 18, speed: 5, creditsReward: 75, experienceReward: 80, minFloor: 3, maxFloor: 10 },
  { name: "Forest Guardian", description: "A nature spirit defending the wild", rarity: "uncommon", health: 40, attack: 14, defense: 10, speed: 7, creditsReward: 30, experienceReward: 35, minFloor: 1, maxFloor: 8 },
  { name: "Shadow Assassin", description: "A deadly agent of the Shadow Veil", rarity: "rare", health: 35, attack: 25, defense: 8, speed: 12, creditsReward: 60, experienceReward: 70, minFloor: 2, maxFloor: 10 },
  { name: "Azure Mage", description: "A powerful spellcaster of the Azure Order", rarity: "rare", health: 50, attack: 22, defense: 6, speed: 8, creditsReward: 70, experienceReward: 75, minFloor: 2, maxFloor: 10 },
  { name: "Crimson Berserker", description: "A frenzied warrior of the Crimson Banner", rarity: "uncommon", health: 55, attack: 18, defense: 6, speed: 9, creditsReward: 45, experienceReward: 50, minFloor: 2, maxFloor: 10 },
  
  // Environment-specific
  { name: "Stone Golem", description: "A construct of animated stone", rarity: "uncommon", health: 70, attack: 16, defense: 20, speed: 3, creditsReward: 50, experienceReward: 55, minFloor: 2, maxFloor: 8 },
  { name: "Wild Wolf", description: "A fierce predator of the wilderness", rarity: "common", health: 35, attack: 14, defense: 6, speed: 10, creditsReward: 25, experienceReward: 30, minFloor: 1, maxFloor: 6 },
  { name: "Cave Dweller", description: "A pale humanoid adapted to underground life", rarity: "common", health: 28, attack: 10, defense: 7, speed: 6, creditsReward: 18, experienceReward: 22, minFloor: 1, maxFloor: 7 },
  
  // Treasure guardians
  { name: "Treasure Guardian", description: "A magical construct protecting valuable items", rarity: "rare", health: 60, attack: 18, defense: 15, speed: 5, creditsReward: 80, experienceReward: 90, minFloor: 1, maxFloor: 10 },
  { name: "Mimic", description: "A shapeshifting creature disguised as treasure", rarity: "uncommon", health: 40, attack: 20, defense: 8, speed: 7, creditsReward: 55, experienceReward: 65, minFloor: 2, maxFloor: 10 },
  
  // Boss-tier
  { name: "Ancient Guardian", description: "An enormous construct of forgotten times", rarity: "epic", health: 150, attack: 30, defense: 25, speed: 4, creditsReward: 200, experienceReward: 250, minFloor: 3, maxFloor: 10 },
  { name: "Dungeon Lord", description: "A powerful entity that rules over this domain", rarity: "legendary", health: 200, attack: 35, defense: 20, speed: 8, creditsReward: 300, experienceReward: 400, minFloor: 5, maxFloor: 10 }
];

async function seedEnemies() {
  try {
    console.log("Seeding enemy data...");
    
    // Clear existing enemies
    await db.delete(enemies);
    
    // Insert new enemy data
    for (const enemy of enemyData) {
      await db.insert(enemies).values(enemy);
    }
    
    console.log(`Successfully seeded ${enemyData.length} enemies`);
  } catch (error) {
    console.error("Error seeding enemies:", error);
    throw error;
  }
}

if (require.main === module) {
  seedEnemies()
    .then(() => {
      console.log("Enemy seeding complete");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Enemy seeding failed:", error);
      process.exit(1);
    });
}

export { seedEnemies };
