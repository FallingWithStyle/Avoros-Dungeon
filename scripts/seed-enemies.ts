
import { db } from "../server/db";
import { creatureTypes } from "../shared/schema";

const creatureData = [
  // Hostile creatures (negative disposition)
  { name: "Wandering Soul", description: "A lost spirit roaming the halls", category: "combat", rarity: "common", health: 25, attack: 8, defense: 3, speed: 5, baseDisposition: -30, creditsReward: 10, experienceReward: 15, minFloor: 1, maxFloor: 3, services: [], dialogue: ["*wails mournfully*", "Why... do you... disturb... my... rest..."] },
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
  
  // Boss-tier (very hostile)
  { name: "Ancient Guardian", description: "An enormous construct of forgotten times", category: "boss", rarity: "epic", health: 150, attack: 30, defense: 25, speed: 4, baseDisposition: -90, creditsReward: 200, experienceReward: 250, minFloor: 3, maxFloor: 10, services: [], dialogue: ["*rumbles threateningly*", "None shall pass!"] },
  { name: "Dungeon Lord", description: "A powerful entity that rules over this domain", category: "boss", rarity: "legendary", health: 200, attack: 35, defense: 20, speed: 8, baseDisposition: -95, creditsReward: 300, experienceReward: 400, minFloor: 5, maxFloor: 10, services: [], dialogue: ["Kneel before your doom!", "This domain is mine!"] },

  // Friendly NPCs (positive disposition)
  { name: "Dungeon Merchant", description: "A shrewd trader who sets up shop in safe rooms", category: "merchant", rarity: "uncommon", health: 50, attack: 5, defense: 10, speed: 6, baseDisposition: 75, creditsReward: 0, experienceReward: 0, minFloor: 1, maxFloor: 10, services: ["trade", "buy_equipment", "sell_equipment"], dialogue: ["Welcome, traveler! See anything you like?", "I've got the finest wares in the dungeon!", "Safe travels, friend!"] },
  { name: "Healer Monk", description: "A peaceful monk offering healing services", category: "healer", rarity: "rare", health: 60, attack: 8, defense: 15, speed: 4, baseDisposition: 85, creditsReward: 0, experienceReward: 0, minFloor: 1, maxFloor: 10, services: ["healing", "cure_ailments", "bless"], dialogue: ["Peace be with you, traveler.", "Your wounds need tending.", "May the light guide your path."] },
  { name: "Quest Giver", description: "A mysterious figure with tasks for brave souls", category: "quest_giver", rarity: "rare", health: 40, attack: 10, defense: 8, speed: 7, baseDisposition: 60, creditsReward: 0, experienceReward: 0, minFloor: 1, maxFloor: 10, services: ["quests", "information", "rewards"], dialogue: ["I have a task that requires someone of your... talents.", "Interested in earning some coin?", "Return when the deed is done."] },
  
  // Neutral creatures (neutral disposition)
  { name: "Curious Scholar", description: "A researcher studying dungeon phenomena", category: "npc", rarity: "uncommon", health: 35, attack: 3, defense: 6, speed: 5, baseDisposition: 10, creditsReward: 0, experienceReward: 0, minFloor: 1, maxFloor: 10, services: ["information", "lore"], dialogue: ["Fascinating! The magical energies here are remarkable!", "Have you seen anything unusual?", "Knowledge is the greatest treasure."] },
  { name: "Lost Explorer", description: "A fellow adventurer who became separated from their group", category: "npc", rarity: "common", health: 30, attack: 8, defense: 5, speed: 6, baseDisposition: 5, creditsReward: 0, experienceReward: 0, minFloor: 1, maxFloor: 8, services: ["information", "directions"], dialogue: ["Have you seen my companions?", "This place is a maze!", "Thank goodness, another living soul!"] }
];

async function seedCreatureTypes() {
  try {
    console.log("Seeding creature type data...");
    
    // Clear existing creature types
    await db.delete(creatureTypes);
    
    // Insert new creature type data
    for (const creature of creatureData) {
      await db.insert(creatureTypes).values(creature);
    }
    
    console.log(`Successfully seeded ${creatureData.length} creature types`);
  } catch (error) {
    console.error("Error seeding creature types:", error);
    throw error;
  }
}

if (require.main === module) {
  seedCreatureTypes()
    .then(() => {
      console.log("Creature type seeding complete");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Creature type seeding failed:", error);
      process.exit(1);
    });
}

export { seedCreatureTypes };
