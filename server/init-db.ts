import { db } from "./db";
import { crawlerClasses, equipment, equipmentTypes, floors, enemies, crawlers } from "@shared/schema";
import { eq, lte } from "drizzle-orm";

export async function initializeDatabase() {
  try {
    console.log("Initializing database with game data...");

    // Insert crawler classes
    await db.insert(crawlerClasses).values([
      {
        name: "Combat Veteran",
        description: "Former military personnel with extensive combat training. High attack and defense capabilities.",
        baseHealth: 120,
        baseAttack: 25,
        baseDefense: 20,
        baseSpeed: 15,
        baseWit: 10,
        baseCharisma: 8,
        baseMemory: 12,
        baseLuck: 5,
      },
      {
        name: "Scholar",
        description: "Expert in problem-solving and information processing. High mental stats.",
        baseHealth: 80,
        baseAttack: 15,
        baseDefense: 12,
        baseSpeed: 22,
        baseWit: 30,
        baseCharisma: 15,
        baseMemory: 25,
        baseLuck: 5,
      },
      {
        name: "Social Engineer",
        description: "Masters of persuasion and manipulation. High charisma and social skills.",
        baseHealth: 100,
        baseAttack: 18,
        baseDefense: 15,
        baseSpeed: 28,
        baseWit: 18,
        baseCharisma: 30,
        baseMemory: 20,
        baseLuck: 5,
      },
    ]).onConflictDoNothing();

    // Insert equipment types
    await db.insert(equipmentTypes).values([
      { name: "Assault Rifle", slot: "weapon" },
      { name: "Plasma Cannon", slot: "weapon" },
      { name: "Combat Armor", slot: "armor" },
      { name: "Tech Augmentation", slot: "accessory" },
    ]).onConflictDoNothing();

    // Insert basic equipment
    await db.insert(equipment).values([
      {
        typeId: 1,
        name: "Makeshift Shiv",
        description: "Crude improvised weapon",
        attackBonus: 5,
        price: 50,
        rarity: "common",
        minFloor: 1,
      },
      {
        typeId: 2,
        name: "Neural Enhancer",
        description: "Basic cognitive augmentation device",
        attackBonus: 2,
        witBonus: 8,
        price: 800,
        rarity: "uncommon",
        minFloor: 3,
      },
      {
        typeId: 3,
        name: "Patched Vest",
        description: "Worn protective clothing",
        defenseBonus: 5,
        healthBonus: 15,
        price: 200,
        rarity: "common",
        minFloor: 1,
      },
      {
        typeId: 4,
        name: "Charm Bracelet",
        description: "Enhances personal magnetism",
        charismaBonus: 6,
        speedBonus: 2,
        price: 600,
        rarity: "rare",
        minFloor: 2,
      },
    ]).onConflictDoNothing();

    // Insert floors
    const floorData = [];
    for (let i = 1; i <= 50; i++) {
      floorData.push({
        floorNumber: i,
        name: `Level ${i} - ${getFloorName(i)}`,
        description: getFloorDescription(i),
        difficulty: Math.floor(i / 5) + 1,
        minRecommendedLevel: i,
      });
    }
    await db.insert(floors).values(floorData).onConflictDoNothing();

    // Insert enemies
    await db.insert(enemies).values([
      {
        name: "Security Drone",
        description: "Automated defense system",
        health: 50,
        attack: 12,
        defense: 8,
        speed: 18,
        creditsReward: 100,
        experienceReward: 25,
        minFloor: 1,
        maxFloor: 10,
      },
      {
        name: "Mutant Scavenger",
        description: "Twisted creature lurking in the depths",
        health: 80,
        attack: 18,
        defense: 10,
        speed: 15,
        creditsReward: 150,
        experienceReward: 40,
        minFloor: 3,
        maxFloor: 15,
      },
      {
        name: "Corrupted AI Core",
        description: "Malevolent artificial intelligence",
        health: 120,
        attack: 25,
        defense: 15,
        speed: 20,
        creditsReward: 300,
        experienceReward: 75,
        minFloor: 8,
        maxFloor: 25,
      },
      {
        name: "Void Stalker",
        description: "Interdimensional predator",
        health: 200,
        attack: 35,
        defense: 25,
        speed: 30,
        creditsReward: 500,
        experienceReward: 120,
        minFloor: 15,
        maxFloor: 35,
      },
      {
        name: "Dungeon Guardian",
        description: "Ancient protector of the deepest levels",
        health: 400,
        attack: 50,
        defense: 40,
        speed: 25,
        creditsReward: 1000,
        experienceReward: 250,
        minFloor: 25,
        maxFloor: 50,
      },
    ]).onConflictDoNothing();

    await initializeRooms();
    console.log("Database initialized successfully!");
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  }
}

function getFloorName(floor: number): string {
  if (floor <= 10) return "Upper Chambers";
  if (floor <= 20) return "Industrial Complex";
  if (floor <= 30) return "Corrupted Sectors";
  if (floor <= 40) return "Void Territories";
  return "The Abyss";
}

function getFloorDescription(floor: number): string {
  if (floor <= 10) return "The initial levels of the dungeon, still showing signs of civilization.";
  if (floor <= 20) return "Abandoned industrial facilities with malfunctioning machinery.";
  if (floor <= 30) return "Reality begins to warp as dark energy permeates the environment.";
  if (floor <= 40) return "The boundaries between dimensions grow thin and unstable.";
  return "The deepest reaches where few have ventured and fewer have returned.";
}

async function initializeRooms() {
  const { rooms, roomConnections, crawlerPositions } = await import("@shared/schema");
  
  // Check if rooms already exist
  const existingRooms = await db.select().from(rooms).limit(1);
  if (existingRooms.length > 0) {
    return; // Rooms already initialized
  }

  // Get floor 1
  const [floor1] = await db.select().from(floors).where(eq(floors.floorNumber, 1));
  if (!floor1) return;

  // Create a large, complex floor layout with multiple boroughs
  const roomData = [
    // Central Hub Area
    { x: 0, y: 0, name: "Dungeon Entrance", description: "A massive stone archway carved with warnings in ancient script. Torches flicker against damp walls.", type: "entrance", isExplored: true, isSafe: true },
    { x: 0, y: 1, name: "Grand Atrium", description: "A vast circular chamber with a cracked domed ceiling. Dried fountains suggest this was once magnificent.", type: "normal" },
    { x: 0, y: 2, name: "Central Crossroads", description: "Four wide passages branch off in cardinal directions. Adventurer graffiti covers the walls.", type: "normal" },
    
    // Northern Borough - The Quarters
    { x: 0, y: 3, name: "Barracks Entrance", description: "Heavy iron gates hang askew. Beyond, you glimpse rows of moldering bunks.", type: "normal" },
    { x: -1, y: 4, name: "Soldier Dormitory", description: "Rotting bunk beds and personal effects scattered about. A sense of abandonment permeates the air.", type: "normal" },
    { x: 0, y: 4, name: "Officer's Quarters", description: "More luxurious chambers with decaying tapestries. A treasure chest sits in the corner.", type: "treasure" },
    { x: 1, y: 4, name: "Weapons Cache", description: "Rusty weapon racks line the walls. Some equipment might still be salvageable.", type: "treasure" },
    { x: 0, y: 5, name: "Training Grounds", description: "A large open area with practice dummies and combat circles worn into the floor.", type: "normal" },
    
    // Eastern Borough - The Markets
    { x: 1, y: 2, name: "Merchant Quarter Gate", description: "An ornate archway decorated with coin motifs leads into the old trading district.", type: "normal" },
    { x: 2, y: 2, name: "Main Bazaar", description: "Empty stalls and broken displays hint at the bustling marketplace this once was.", type: "normal" },
    { x: 3, y: 2, name: "Jeweler's Workshop", description: "Delicate tools and gem fragments litter workbenches. A secret safe might remain.", type: "treasure" },
    { x: 2, y: 1, name: "Money Changer's Vault", description: "A heavily reinforced room with an open vault door. Coins spill across the floor.", type: "treasure" },
    { x: 2, y: 3, name: "Tavern Commons", description: "Overturned tables and broken bottles. The smell of stale ale still lingers.", type: "normal" },
    { x: 3, y: 3, name: "Inn's Upper Floor", description: "Private rooms for wealthy travelers. Silk curtains hang in tatters.", type: "normal" },
    
    // Western Borough - The Workshops
    { x: -1, y: 2, name: "Artisan District", description: "Workshop doors stand open, revealing abandoned forges and looms.", type: "normal" },
    { x: -2, y: 2, name: "Blacksmith Forge", description: "A massive forge dominates the room. Unfinished weapons lie cooling on the anvil.", type: "normal" },
    { x: -3, y: 2, name: "Master Smith's Chamber", description: "The finest crafting tools and rare materials. A hidden compartment gleams.", type: "treasure" },
    { x: -2, y: 1, name: "Tool Workshop", description: "Precision instruments and mechanical devices in various states of completion.", type: "normal" },
    { x: -2, y: 3, name: "Textile Mill", description: "Looms and spinning wheels stand silent. Bolts of rare fabric remain untouched.", type: "treasure" },
    { x: -1, y: 3, name: "Carpenter's Hall", description: "Wood shavings and half-finished furniture. The scent of sawdust fills the air.", type: "normal" },
    
    // Southern Borough - The Depths
    { x: 0, y: -1, name: "Lower Passage", description: "A descending corridor carved from living rock. The air grows colder.", type: "normal" },
    { x: 0, y: -2, name: "Ancient Catacombs", description: "Stone sarcophagi line the walls. Ancient bones peer through cracks.", type: "normal" },
    { x: -1, y: -2, name: "Tomb of the First Guardian", description: "An elaborate burial chamber with mystical symbols. Dark energy emanates from within.", type: "treasure" },
    { x: 1, y: -2, name: "Bone Chapel", description: "A macabre shrine constructed entirely from human remains. Unholy power lingers.", type: "normal" },
    { x: 0, y: -3, name: "Forgotten Crypts", description: "Deeper tombs where shadows seem to move of their own accord.", type: "normal" },
    
    // Single staircase - extremely rare (1/1000 rooms)
    { x: 0, y: -4, name: "Deep Sanctuary Steps", description: "The deepest staircase, leading downward into mysteries unknown.", type: "stairs" },
    
    // Convert former staircases to normal/treasure rooms
    { x: 2, y: 4, name: "North Tower Chamber", description: "A circular room in an ancient tower. Tapestries hang from stone walls.", type: "normal" },
    { x: 4, y: 2, name: "East Wing Gallery", description: "An elegant hallway with marble columns. Portraits watch from gilded frames.", type: "normal" },
    { x: 3, y: 1, name: "Market Tower Vault", description: "A secured chamber where merchants once stored their most valuable goods.", type: "treasure" },
    { x: 3, y: 4, name: "Noble Quarter Library", description: "Shelves of ancient tomes and scrolls. Knowledge is power.", type: "treasure" },
    { x: -3, y: 1, name: "Craftsman's Storage", description: "Rare materials and unfinished masterworks fill this workshop annex.", type: "treasure" },
    { x: -4, y: 2, name: "West Tower Armory", description: "Weapon racks and armor stands guard ancient military secrets.", type: "normal" },
    { x: -2, y: 4, name: "Workshop Archive", description: "Technical blueprints and mechanical diagrams cover every surface.", type: "normal" },
    { x: -1, y: 5, name: "Barracks Command", description: "Strategic maps and military orders remain pinned to planning tables.", type: "normal" },
    { x: 1, y: 5, name: "Training Equipment Room", description: "Practice weapons and combat training gear await new recruits.", type: "normal" },
    { x: 1, y: -3, name: "Crypt Memorial", description: "Ancient burial chambers with ornate stone coffins and memorial plaques.", type: "normal" },
    { x: -1, y: -3, name: "Sacred Chamber", description: "A holy sanctuary carved with protective runes and blessed symbols.", type: "normal" },
    
    // Additional atmospheric rooms
    { x: -3, y: 3, name: "Spinner's Alcove", description: "A cozy corner where weavers once worked by candlelight.", type: "normal" },
    { x: 4, y: 3, name: "Noble's Private Study", description: "Books and scrolls fill elegant shelves. Knowledge awaits the curious.", type: "treasure" },
    { x: 1, y: 1, name: "Guard Checkpoint", description: "A watchtower position overlooking multiple passages.", type: "normal" },
    { x: -1, y: 1, name: "Artisan's Gallery", description: "Displays of the finest crafted goods. Some pieces retain their value.", type: "treasure" },
    { x: 4, y: 1, name: "Merchant Prince's Office", description: "Luxury appointments and trade documents. A vault door stands ajar.", type: "treasure" },
    { x: -3, y: 4, name: "Master's Private Forge", description: "A personal smithy with experimental alloys and rare metals.", type: "treasure" },
    { x: 2, y: 0, name: "Eastern Gatehouse", description: "Defensive position guarding the market approaches.", type: "normal" },
    { x: -2, y: 0, name: "Western Gatehouse", description: "A fortified checkpoint protecting the artisan quarter.", type: "normal" },
    { x: 0, y: 6, name: "North Tower Base", description: "The foundation of a great tower. Structural supports reach skyward.", type: "normal" },
    { x: 2, y: -1, name: "Memorial Garden", description: "A peaceful courtyard with withered plants and memorial stones.", type: "normal", isSafe: true },
    
    // Single staircase - extremely rare (1/1000 rooms)
    { x: 0, y: -4, name: "Deep Sanctuary Steps", description: "The deepest staircase, leading downward into mysteries unknown.", type: "stairs" },
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

  // Create a map for quick room lookup by coordinates
  const roomsByCoords = new Map();
  insertedRooms.forEach(room => {
    roomsByCoords.set(`${room.x},${room.y}`, room);
  });

  // Create room connections based on adjacency
  const connections = [];
  
  for (const room of insertedRooms) {
    // Check all four directions
    const directions = [
      { dx: 0, dy: 1, dir: "north" },
      { dx: 1, dy: 0, dir: "east" }, 
      { dx: 0, dy: -1, dir: "south" },
      { dx: -1, dy: 0, dir: "west" }
    ];
    
    for (const { dx, dy, dir } of directions) {
      const adjacentX = room.x + dx;
      const adjacentY = room.y + dy;
      const adjacentRoom = roomsByCoords.get(`${adjacentX},${adjacentY}`);
      
      if (adjacentRoom) {
        connections.push({
          fromRoomId: room.id,
          toRoomId: adjacentRoom.id,
          direction: dir
        });
      }
    }
  }

  // Insert all connections
  if (connections.length > 0) {
    await db.insert(roomConnections).values(connections).onConflictDoNothing();
  }
}