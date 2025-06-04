import { db } from "./db";
import { eq, and, lte } from "drizzle-orm";

export async function initializeDatabase() {
  console.log("Initializing database with game data...");
  
  // Initialize floors first
  await initializeFloors();
  
  // Initialize rooms
  await initializeRooms();
  
  // Initialize crawler classes
  await initializeCrawlerClasses();
  
  // Initialize equipment types
  await initializeEquipmentTypes();
  
  // Initialize equipment
  await initializeEquipment();
  
  // Initialize enemies
  await initializeEnemies();
  
  // Initialize seasons
  await initializeSeasons();

  console.log("Database initialized successfully!");
}

async function initializeFloors() {
  const { floors } = await import("@shared/schema");
  
  // Check if floors already exist
  const existingFloors = await db.select().from(floors).limit(1);
  if (existingFloors.length > 0) {
    return; // Floors already initialized
  }

  // Create floors 1-10 with unique themes
  const floorData = [];
  for (let i = 1; i <= 10; i++) {
    floorData.push({
      floorNumber: i,
      name: getFloorName(i),
      description: getFloorDescription(i),
      dangerLevel: Math.min(i, 10),
      isActive: true
    });
  }

  // Insert all floors
  for (const floor of floorData) {
    await db.insert(floors).values(floor);
  }
}

function getFloorName(floor: number): string {
  const names = [
    "", // 0 placeholder
    "Ruined Castle Grounds",
    "Ancient Crypts", 
    "Alchemical Laboratories",
    "Prison Complex",
    "Flooded Caverns",
    "Mechanical Workshop", 
    "Crystal Mines",
    "Ancient Temple",
    "Dragon's Lair",
    "Cosmic Observatory"
  ];
  return names[floor] || `Deep Level ${floor}`;
}

function getFloorDescription(floor: number): string {
  if (floor <= 5) return "The upper levels show signs of recent civilization and decay.";
  if (floor <= 10) return "Deeper chambers reveal stranger and more dangerous mysteries.";
  if (floor <= 20) return "The architecture becomes increasingly alien and hostile.";
  if (floor <= 30) return "Few adventurers have reported back from these depths.";
  if (floor <= 40) return "The boundaries between dimensions grow thin and unstable.";
  return "The deepest reaches where few have ventured and fewer have returned.";
}

async function initializeRooms() {
  const { rooms, roomConnections, crawlerPositions, floors } = await import("@shared/schema");
  
  // Check if rooms already exist
  const existingRooms = await db.select().from(rooms).limit(1);
  if (existingRooms.length > 0) {
    return; // Rooms already initialized
  }

  // Get floor 1 only for now - we'll add more floors later
  const [floor1] = await db.select().from(floors).where(eq(floors.floorNumber, 1));
  if (!floor1) return;

  // Create a large, complex floor layout with multiple boroughs
  const roomData = [
    // Central Hub Area
    { x: 0, y: 0, name: "Dungeon Entrance", description: "A massive stone archway carved with warnings in ancient script. Torches flicker against damp walls.", type: "entrance", isExplored: true, isSafe: true },
    { x: 0, y: 1, name: "Grand Atrium", description: "A vast circular chamber with a cracked domed ceiling. Dried fountains suggest this was once magnificent.", type: "normal" },
    { x: 0, y: 2, name: "Central Crossroads", description: "Four wide passages branch off in cardinal directions. Adventurer graffiti covers the walls.", type: "normal" },
    
    // Eastern Wing - Guard Quarters
    { x: 1, y: 0, name: "Guard Post", description: "Rusty weapon racks line the walls. A skeleton in armor slumps against a desk.", type: "normal" },
    { x: 2, y: 0, name: "Armory Remains", description: "Broken weapons and corroded armor pieces scattered across stone shelves.", type: "normal" },
    { x: 1, y: 1, name: "Barracks Hall", description: "Rows of moldy beds with personal effects still scattered about.", type: "normal" },
    { x: 2, y: 1, name: "Officers' Quarters", description: "A private chamber with maps pinned to walls and a locked chest.", type: "normal" },
    
    // Western Wing - Servants' Area
    { x: -1, y: 0, name: "Kitchen Ruins", description: "Massive stone ovens and rusted pots. The smell of ancient cooking fires lingers.", type: "normal" },
    { x: -2, y: 0, name: "Food Storage", description: "Empty barrels and grain sacks turned to dust. Rat bones crunch underfoot.", type: "normal" },
    { x: -1, y: 1, name: "Servants' Hall", description: "Simple wooden tables and benches, now warped and rotting.", type: "normal" },
    { x: -2, y: 1, name: "Scullery", description: "Stone sinks filled with stagnant water. Moss grows on every surface.", type: "normal" },
    
    // Northern Wing - Living Quarters
    { x: 0, y: 3, name: "Noble Quarters", description: "Ornate but decaying chambers with torn tapestries and broken furniture.", type: "normal" },
    { x: 1, y: 3, name: "Guest Chambers", description: "Once-fine rooms now home to spider webs and dust.", type: "normal" },
    { x: -1, y: 3, name: "Library Ruins", description: "Collapsed bookshelves and scattered pages. Some tomes might still be readable.", type: "normal" },
    { x: 0, y: 4, name: "Great Hall", description: "A massive chamber with a collapsed roof. Moonlight streams through the gaps.", type: "normal" },
    
    // Southern Wing - Administrative
    { x: 0, y: -1, name: "Records Room", description: "Shelves of moldering documents and ledgers. Some contain interesting historical notes.", type: "normal" },
    { x: 1, y: -1, name: "Treasury Antechamber", description: "Heavy doors stand ajar. Scratch marks suggest something tried to get in... or out.", type: "normal" },
    { x: -1, y: -1, name: "Clerk's Office", description: "Desks covered in paperwork from a bygone era. An abacus sits perfectly preserved.", type: "normal" },
    { x: 0, y: -2, name: "Courthouse", description: "A formal chamber with a judge's bench. Ancient scales of justice hang broken.", type: "normal" },
    
    // Eastern Extensions
    { x: 3, y: 0, name: "Stables", description: "Empty horse stalls with rotting hay. Harnesses hang from rusted hooks.", type: "normal" },
    { x: 3, y: 1, name: "Blacksmith Shop", description: "A cold forge with anvil and hammers. Half-finished weapons lie abandoned.", type: "normal" },
    { x: 2, y: 2, name: "Training Yard", description: "An open area with weapon dummies and practice targets.", type: "normal" },
    
    // Western Extensions  
    { x: -3, y: 0, name: "Wine Cellar", description: "Broken bottles and wine-stained walls. The air smells of fermentation.", type: "normal" },
    { x: -3, y: 1, name: "Root Cellar", description: "Stone shelves once held vegetables. Now only mold and darkness remain.", type: "normal" },
    { x: -2, y: 2, name: "Pantry", description: "Empty shelves and mouse holes. A few ceramic jars sit intact.", type: "normal" },
    
    // Northern Extensions
    { x: 1, y: 4, name: "Chapel", description: "Broken pews face a defaced altar. Stained glass windows lie shattered.", type: "normal" },
    { x: -1, y: 4, name: "Art Gallery", description: "Empty frames hang askew on cracked walls. One painting remains, depicting a dark figure.", type: "normal" },
    { x: 0, y: 5, name: "Spiral Staircase", description: "Stone steps wind downward into darkness. The air grows colder below.", type: "stairs" }
  ];

  // Insert all rooms
  const insertedRooms = [];
  for (const room of roomData) {
    const [insertedRoom] = await db.insert(rooms).values({
      floorId: floor1.id,
      ...room
    }).returning();
    insertedRooms.push(insertedRoom);
  }

  // Create a map of coordinates to rooms for easy lookup
  const roomsByCoords = new Map();
  insertedRooms.forEach(room => {
    roomsByCoords.set(`${room.x},${room.y}`, room);
  });

  // Create connections between adjacent rooms
  const connections = [];
  for (const room of insertedRooms) {
    // Check north, south, east, west
    const directions = [
      { dx: 0, dy: 1, direction: 'north' },
      { dx: 0, dy: -1, direction: 'south' },
      { dx: 1, dy: 0, direction: 'east' },
      { dx: -1, dy: 0, direction: 'west' }
    ];

    for (const { dx, dy, direction } of directions) {
      const adjacentKey = `${room.x + dx},${room.y + dy}`;
      const adjacentRoom = roomsByCoords.get(adjacentKey);
      
      if (adjacentRoom) {
        connections.push({
          fromRoomId: room.id,
          toRoomId: adjacentRoom.id,
          direction
        });
      }
    }
  }

  // Insert all connections
  for (const connection of connections) {
    await db.insert(roomConnections).values(connection);
  }
}

async function initializeCrawlerClasses() {
  const { crawlerClasses } = await import("@shared/schema");
  
  // Check if classes already exist
  const existingClasses = await db.select().from(crawlerClasses).limit(1);
  if (existingClasses.length > 0) {
    return; // Classes already initialized
  }

  const classes = [
    {
      name: "Survivor",
      description: "Hardy individuals who've learned to adapt and endure against all odds.",
      startingStats: JSON.stringify({ attack: 2, defense: 3, speed: 2, wit: 2, charisma: 1, memory: 2 }),
      competencies: JSON.stringify(["Survival", "Scavenging"]),
      rarity: "common"
    },
    {
      name: "Scavenger",
      description: "Resourceful explorers who excel at finding useful items in dangerous places.",
      startingStats: JSON.stringify({ attack: 1, defense: 2, speed: 3, wit: 3, charisma: 2, memory: 1 }),
      competencies: JSON.stringify(["Scavenging", "Trap Detection"]),
      rarity: "common"
    },
    {
      name: "Brawler",
      description: "Tough fighters who prefer direct confrontation over subtlety.",
      startingStats: JSON.stringify({ attack: 4, defense: 3, speed: 1, wit: 1, charisma: 1, memory: 2 }),
      competencies: JSON.stringify(["Combat", "Intimidation"]),
      rarity: "common"
    },
    {
      name: "Trickster",
      description: "Clever manipulators who use wit and charm to overcome obstacles.",
      startingStats: JSON.stringify({ attack: 1, defense: 1, speed: 3, wit: 4, charisma: 3, memory: 0 }),
      competencies: JSON.stringify(["Deception", "Trap Detection"]),
      rarity: "uncommon"
    },
    {
      name: "Scholar",
      description: "Educated individuals who rely on knowledge and careful planning.",
      startingStats: JSON.stringify({ attack: 0, defense: 1, speed: 2, wit: 3, charisma: 2, memory: 4 }),
      competencies: JSON.stringify(["Research", "Ancient Lore"]),
      rarity: "uncommon"
    },
    {
      name: "Mystic",
      description: "Enigmatic figures with an uncanny understanding of supernatural forces.",
      startingStats: JSON.stringify({ attack: 1, defense: 2, speed: 2, wit: 4, charisma: 3, memory: 0 }),
      competencies: JSON.stringify(["Supernatural", "Intuition"]),
      rarity: "rare"
    }
  ];

  for (const crawlerClass of classes) {
    await db.insert(crawlerClasses).values(crawlerClass);
  }
}

async function initializeEquipmentTypes() {
  const { equipmentTypes } = await import("@shared/schema");
  
  // Check if equipment types already exist
  const existingTypes = await db.select().from(equipmentTypes).limit(1);
  if (existingTypes.length > 0) {
    return; // Equipment types already initialized
  }

  const types = [
    { name: "Weapon", description: "Items used for combat and defense" },
    { name: "Armor", description: "Protective gear and clothing" },
    { name: "Tool", description: "Utility items and equipment" },
    { name: "Consumable", description: "Single-use items and supplies" },
    { name: "Accessory", description: "Jewelry, trinkets, and enhancement items" }
  ];

  for (const type of types) {
    await db.insert(equipmentTypes).values(type);
  }
}

async function initializeEquipment() {
  const { equipment, equipmentTypes } = await import("@shared/schema");
  
  // Check if equipment already exists
  const existingEquipment = await db.select().from(equipment).limit(1);
  if (existingEquipment.length > 0) {
    return; // Equipment already initialized
  }

  // Get equipment type IDs
  const types = await db.select().from(equipmentTypes);
  const weaponType = types.find(t => t.name === "Weapon");
  const armorType = types.find(t => t.name === "Armor");
  const toolType = types.find(t => t.name === "Tool");
  const consumableType = types.find(t => t.name === "Consumable");
  const accessoryType = types.find(t => t.name === "Accessory");

  const equipmentItems = [
    // Weapons
    { name: "Rusty Knife", description: "A dull blade that's seen better days.", typeId: weaponType?.id, rarity: "common", statModifiers: JSON.stringify({ attack: 1 }), marketValue: 5 },
    { name: "Makeshift Club", description: "A heavy piece of wood wrapped with cloth.", typeId: weaponType?.id, rarity: "common", statModifiers: JSON.stringify({ attack: 2 }), marketValue: 8 },
    { name: "Crowbar", description: "Useful for both breaking things and breaking into things.", typeId: weaponType?.id, rarity: "common", statModifiers: JSON.stringify({ attack: 1 }), marketValue: 12 },
    
    // Armor
    { name: "Worn Jacket", description: "A sturdy jacket with multiple pockets.", typeId: armorType?.id, rarity: "common", statModifiers: JSON.stringify({ defense: 1 }), marketValue: 10 },
    { name: "Work Boots", description: "Heavy boots that protect your feet.", typeId: armorType?.id, rarity: "common", statModifiers: JSON.stringify({ defense: 1 }), marketValue: 15 },
    { name: "Hard Hat", description: "Industrial safety equipment.", typeId: armorType?.id, rarity: "common", statModifiers: JSON.stringify({ defense: 1 }), marketValue: 8 },
    
    // Tools
    { name: "Flashlight", description: "Provides light in dark places.", typeId: toolType?.id, rarity: "common", statModifiers: JSON.stringify({}), marketValue: 6 },
    { name: "Rope", description: "50 feet of sturdy climbing rope.", typeId: toolType?.id, rarity: "common", statModifiers: JSON.stringify({}), marketValue: 10 },
    { name: "First Aid Kit", description: "Basic medical supplies.", typeId: toolType?.id, rarity: "common", statModifiers: JSON.stringify({}), marketValue: 20 },
    
    // Consumables
    { name: "Energy Bar", description: "Restores a small amount of energy.", typeId: consumableType?.id, rarity: "common", statModifiers: JSON.stringify({}), marketValue: 3 },
    { name: "Water Bottle", description: "Clean drinking water.", typeId: consumableType?.id, rarity: "common", statModifiers: JSON.stringify({}), marketValue: 2 },
    { name: "Painkiller", description: "Reduces pain and improves focus.", typeId: consumableType?.id, rarity: "common", statModifiers: JSON.stringify({}), marketValue: 5 },
    
    // Accessories
    { name: "Lucky Coin", description: "A shiny coin that might bring good fortune.", typeId: accessoryType?.id, rarity: "uncommon", statModifiers: JSON.stringify({ luck: 1 }), marketValue: 25 },
    { name: "Digital Watch", description: "Keeps accurate time and has basic functions.", typeId: accessoryType?.id, rarity: "common", statModifiers: JSON.stringify({}), marketValue: 15 },
    { name: "Compass", description: "Always points toward magnetic north.", typeId: accessoryType?.id, rarity: "common", statModifiers: JSON.stringify({}), marketValue: 12 }
  ];

  for (const item of equipmentItems) {
    if (item.typeId) {
      await db.insert(equipment).values(item);
    }
  }
}

async function initializeEnemies() {
  const { enemies, floors } = await import("@shared/schema");
  
  // Check if enemies already exist
  const existingEnemies = await db.select().from(enemies).limit(1);
  if (existingEnemies.length > 0) {
    return; // Enemies already initialized
  }

  // Get floor 1
  const [floor1] = await db.select().from(floors).where(eq(floors.floorNumber, 1));
  if (!floor1) return;

  const enemyData = [
    {
      name: "Sewer Rat",
      description: "A large, aggressive rodent with yellow teeth.",
      floorId: floor1.id,
      health: 8,
      attack: 2,
      defense: 0,
      speed: 3,
      lootTable: JSON.stringify([
        { item: "Raw Meat", chance: 0.7, quantity: 1 },
        { item: "Rat Tail", chance: 0.3, quantity: 1 }
      ]),
      experienceReward: 5,
      abilities: JSON.stringify(["Quick Bite"])
    },
    {
      name: "Skeleton Guard",
      description: "The animated remains of a former castle guard.",
      floorId: floor1.id,
      health: 15,
      attack: 4,
      defense: 2,
      speed: 1,
      lootTable: JSON.stringify([
        { item: "Bone Fragment", chance: 0.8, quantity: 1 },
        { item: "Rusty Sword", chance: 0.2, quantity: 1 }
      ]),
      experienceReward: 12,
      abilities: JSON.stringify(["Undead Resilience"])
    },
    {
      name: "Giant Spider",
      description: "A web-spinning predator the size of a small dog.",
      floorId: floor1.id,
      health: 12,
      attack: 3,
      defense: 1,
      speed: 4,
      lootTable: JSON.stringify([
        { item: "Spider Silk", chance: 0.9, quantity: 2 },
        { item: "Venom Sac", chance: 0.4, quantity: 1 }
      ]),
      experienceReward: 8,
      abilities: JSON.stringify(["Web Trap", "Poison Bite"])
    }
  ];

  for (const enemy of enemyData) {
    await db.insert(enemies).values(enemy);
  }
}

async function initializeSeasons() {
  const { seasons } = await import("@shared/schema");
  
  // Check if seasons already exist
  const existingSeason = await db.select().from(seasons).limit(1);
  if (existingSeason.length > 0) {
    return; // Season already initialized
  }

  // Create Season 1
  await db.insert(seasons).values({
    seasonNumber: 1,
    name: "The Descent Begins",
    description: "The first brave souls venture into the mysterious depths beneath the old castle.",
    startDate: new Date(),
    endDate: null, // Ongoing
    isActive: true,
    maxPrimarySponsorsips: 1000
  });
}