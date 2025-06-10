
/**
 * File: seed-dynamic-content.ts
 * Responsibility: Seeds database with floor themes, room types, crawler backgrounds, and combat flavor text
 * Notes: Populates content tables used for procedural generation and storytelling elements
 */
import { db } from "../server/db";
import { 
  floorThemes, 
  roomTypes, 
  crawlerBackgrounds, 
  preDungeonJobs, 
  combatFlavorText 
} from "../shared/schema";

const floorThemeData = [
  {
    floorNumber: 1,
    name: "Ruined Castle Grounds",
    description: "Crumbling battlements and overgrown courtyards",
  },
  {
    floorNumber: 2,
    name: "Ancient Crypts",
    description: "Stone tombs and burial chambers",
  },
  {
    floorNumber: 3,
    name: "Alchemical Laboratories",
    description: "Chambers filled with strange apparatus and bubbling concoctions",
  },
  {
    floorNumber: 4,
    name: "Prison Complex",
    description: "Cells and interrogation chambers",
  },
  {
    floorNumber: 5,
    name: "Flooded Caverns",
    description: "Water-filled chambers with slippery surfaces",
  },
  {
    floorNumber: 6,
    name: "Mechanical Workshop",
    description: "Halls filled with gears, pistons, and steam",
  },
  {
    floorNumber: 7,
    name: "Crystal Mines",
    description: "Sparkling chambers carved from living rock",
  },
  {
    floorNumber: 8,
    name: "Ancient Temple",
    description: "Sacred halls dedicated to forgotten gods",
  },
  {
    floorNumber: 9,
    name: "Dragon's Lair",
    description: "Scorched chambers reeking of sulfur",
  },
  {
    floorNumber: 10,
    name: "Cosmic Observatory",
    description: "Chambers focused on celestial observation",
  },
];

const roomTypeData = [
  // Floor 1 - Ruined Castle Grounds
  { floorNumber: 1, name: "Collapsed Watchtower", description: "Stone debris blocks most passages" },
  { floorNumber: 1, name: "Overgrown Courtyard", description: "Weeds grow through cracked flagstones" },
  { floorNumber: 1, name: "Ruined Barracks", description: "Rotting wooden bunks and rusted weapons" },
  { floorNumber: 1, name: "Old Armory", description: "Empty weapon racks and broken shields" },
  
  // Floor 2 - Ancient Crypts
  { floorNumber: 2, name: "Burial Chamber", description: "Ancient sarcophagi line the walls" },
  { floorNumber: 2, name: "Ossuary", description: "Bones arranged in intricate patterns" },
  { floorNumber: 2, name: "Tomb Antechamber", description: "Carved reliefs tell forgotten stories" },
  { floorNumber: 2, name: "Catacombs", description: "Narrow passages between burial niches" },
  
  // Floor 3 - Alchemical Laboratories
  { floorNumber: 3, name: "Distillation Chamber", description: "Complex glassware covers every surface" },
  { floorNumber: 3, name: "Reagent Storage", description: "Shelves of mysterious bottles and powders" },
  { floorNumber: 3, name: "Experimentation Lab", description: "Tables scarred by acid and fire" },
  { floorNumber: 3, name: "Transmutation Circle", description: "Arcane symbols etched into the floor" },
  
  // Floor 4 - Prison Complex
  { floorNumber: 4, name: "Prison Cell", description: "Iron bars and moldy straw" },
  { floorNumber: 4, name: "Guard Station", description: "Keys hang from hooks on the wall" },
  { floorNumber: 4, name: "Interrogation Room", description: "Ominous stains mark the floor" },
  { floorNumber: 4, name: "Solitary Confinement", description: "A small, windowless chamber" },
  
  // Floor 5 - Flooded Caverns
  { floorNumber: 5, name: "Underground Pool", description: "Dark water reflects the ceiling" },
  { floorNumber: 5, name: "Dripping Grotto", description: "Constant water droplets echo endlessly" },
  { floorNumber: 5, name: "Flooded Passage", description: "Ankle-deep water covers the floor" },
  { floorNumber: 5, name: "Underground River", description: "Fast-moving water blocks the way" },
  
  // Floor 6 - Mechanical Workshop
  { floorNumber: 6, name: "Gear Chamber", description: "Massive clockwork mechanisms fill the space" },
  { floorNumber: 6, name: "Steam Engine Room", description: "Pipes release jets of hot vapor" },
  { floorNumber: 6, name: "Assembly Line", description: "Conveyor belts and robotic arms" },
  { floorNumber: 6, name: "Control Room", description: "Dozens of levers and gauges" },
  
  // Floor 7 - Crystal Mines
  { floorNumber: 7, name: "Crystal Cavern", description: "Brilliant gems illuminate the walls" },
  { floorNumber: 7, name: "Mining Shaft", description: "Pick marks score the tunnel walls" },
  { floorNumber: 7, name: "Gem Processing", description: "Cutting tools and polishing stations" },
  { floorNumber: 7, name: "Crystal Formation", description: "Natural crystals grow in impossible shapes" },
  
  // Floor 8 - Ancient Temple
  { floorNumber: 8, name: "Prayer Hall", description: "Rows of stone pews face an altar" },
  { floorNumber: 8, name: "Shrine Room", description: "Offerings lie before weathered statues" },
  { floorNumber: 8, name: "Ceremonial Chamber", description: "Ritual circles mark the floor" },
  { floorNumber: 8, name: "Sanctum", description: "The most sacred space, radiating power" },
  
  // Floor 9 - Dragon's Lair
  { floorNumber: 9, name: "Treasure Hoard", description: "Piles of gold and precious objects" },
  { floorNumber: 9, name: "Sleeping Chamber", description: "Massive indentations in the stone floor" },
  { floorNumber: 9, name: "Scorched Hall", description: "Walls blackened by dragonfire" },
  { floorNumber: 9, name: "Bone Yard", description: "Remains of unfortunate adventurers" },
  
  // Floor 10 - Cosmic Observatory
  { floorNumber: 10, name: "Star Chart Room", description: "Constellation maps cover the ceiling" },
  { floorNumber: 10, name: "Telescope Chamber", description: "Massive brass instruments point skyward" },
  { floorNumber: 10, name: "Astrolabe Workshop", description: "Precise instruments for celestial navigation" },
  { floorNumber: 10, name: "Portal Nexus", description: "Swirling energies connect to distant realms" },
];

const desperateBackgrounds = [
  "Hiding from ex-partner's criminal associates who want them dead",
  "Fled into the dungeon after witnessing a mob assassination",
  "Chasing their missing sibling who entered the dungeon weeks ago",
  "Escaping massive gambling debts to dangerous loan sharks",
  "On the run after accidentally uncovering corporate corruption",
  "Homeless and desperate after being evicted from their apartment",
  "Seeking their missing child who was kidnapped by cultists",
  "Fleeing after their medical practice was shut down for whistleblowing",
  "Running from a private investigator hired by their former employer",
  "Lost everything in a Ponzi scheme and has nowhere else to go",
  "Trying to disappear after their research exposed government secrets",
  "Following their mentor who vanished into the dungeon with vital evidence",
];

const wackyBackgrounds = [
  "Professional food critic whose scathing review of a corporate cafeteria somehow led to a nationwide manhunt",
  "Used to run an underground origami club that accidentally became a resistance movement",
  "Former birthday party clown who witnessed something they shouldn't have at a corporate executive's kid's party",
  "Librarian who discovered that late fees were being used to fund illegal weapons research",
  "Freelance mime who broke character at the wrong moment and saw too much",
  "Pet groomer whose client's 'dog' turned out to be an escaped lab animal",
  "Wedding photographer who captured evidence of corporate conspiracy in the background of a family photo",
  "Substitute teacher who found their lesson plans were actually coded instructions for industrial sabotage",
  "Street magician whose 'magic' trick accidentally hacked into corporate mainframes",
  "Yoga instructor whose meditation sessions were unknowingly being used as cover for money laundering meetings",
  "Ice cream truck driver who discovered their route was being used to smuggle contraband",
  "Professional stand-up comedian whose jokes about corporate life were too accurate for comfort",
  "Crossword puzzle creator who embedded secret messages and didn't realize until corporate goons showed up",
  "Dog walker who overheard the wrong conversation in the wrong corporate park",
];

const preDungeonJobData = [
  "Accountant", "Barista", "Marketing Specialist", "Software Developer",
  "Nurse", "Teacher", "Security Guard", "Chef", "Retail Manager",
  "Graphic Designer", "Mechanic", "Librarian", "Sales Representative",
  "Data Analyst", "Customer Service Rep", "Photographer", "Writer",
  "Personal Trainer", "Event Coordinator", "Lab Technician"
];

const combatFlavorData = [
  { category: "encounter_start", text: "The shadows stir with malevolent intent!" },
  { category: "encounter_start", text: "Hostile creatures emerge from the darkness!" },
  { category: "encounter_start", text: "Combat erupts as enemies attack!" },
  { category: "victory", text: "The enemies lie defeated at your feet." },
  { category: "victory", text: "Victory is yours! The threat has been neutralized." },
  { category: "victory", text: "Your combat skills prove superior!" },
  { category: "discovery", text: "A holographic message from a previous expedition plays nearby!" },
  { category: "discovery", text: "Ancient markings on the wall tell a mysterious story!" },
  { category: "discovery", text: "You find evidence of the dungeon's mysterious past!" },
];

async function seedDynamicContent() {
  console.log("Seeding dynamic content...");

  // Seed floor themes
  console.log("Seeding floor themes...");
  for (const theme of floorThemeData) {
    await db.insert(floorThemes).values(theme).onConflictDoNothing();
  }

  // Get floor theme IDs for room types
  const themes = await db.select().from(floorThemes);
  const themeMap = Object.fromEntries(themes.map(t => [t.floorNumber, t.id]));

  // Seed room types
  console.log("Seeding room types...");
  for (const roomType of roomTypeData) {
    await db.insert(roomTypes).values({
      floorThemeId: themeMap[roomType.floorNumber],
      name: roomType.name,
      description: roomType.description,
      weight: 1,
    }).onConflictDoNothing();
  }

  // Seed crawler backgrounds
  console.log("Seeding crawler backgrounds...");
  for (const story of desperateBackgrounds) {
    await db.insert(crawlerBackgrounds).values({
      category: "desperate",
      story,
      weight: 1,
    }).onConflictDoNothing();
  }
  
  for (const story of wackyBackgrounds) {
    await db.insert(crawlerBackgrounds).values({
      category: "wacky", 
      story,
      weight: 1,
    }).onConflictDoNothing();
  }

  // Seed pre-dungeon jobs
  console.log("Seeding pre-dungeon jobs...");
  for (const job of preDungeonJobData) {
    await db.insert(preDungeonJobs).values({
      jobTitle: job,
      weight: 1,
    }).onConflictDoNothing();
  }

  // Seed combat flavor text
  console.log("Seeding combat flavor text...");
  for (const flavor of combatFlavorData) {
    await db.insert(combatFlavorText).values(flavor).onConflictDoNothing();
  }

  console.log("Dynamic content seeding complete!");
}

async function run() {
  try {
    await seedDynamicContent();
    process.exit(0);
  } catch (error) {
    console.error("Error seeding dynamic content:", error);
    process.exit(1);
  }
}

run();
