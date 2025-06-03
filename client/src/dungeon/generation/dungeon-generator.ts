import { db } from "server/db.ts";
import { floors, rooms, roomConnections } from "@shared/schema";

interface FloorTheme {
  name: string;
  description: string;
  roomTypes: Array<{
    name: string;
    description: string;
    weight: number;
  }>;
}

const floorThemes: FloorTheme[] = [
  {
    name: "Abandoned Fortress",
    description: "Ancient stone corridors and guard chambers",
    roomTypes: [
      { name: "Guard Post", description: "Rusty weapons and armor scattered about", weight: 20 },
      { name: "Armory", description: "Empty weapon racks line stone walls", weight: 15 },
      { name: "Barracks", description: "Rows of moldy beds and overturned furniture", weight: 15 },
      { name: "Storage Room", description: "Broken crates and empty shelves", weight: 25 },
      { name: "Corridor", description: "Long stone hallway with flickering torches", weight: 25 }
    ]
  },
  {
    name: "Ancient Crypts",
    description: "Burial chambers and tomb passages",
    roomTypes: [
      { name: "Burial Chamber", description: "Stone sarcophagi line the walls", weight: 25 },
      { name: "Crypt Passage", description: "Narrow corridors between tombs", weight: 30 },
      { name: "Ossuary", description: "Walls lined with ancient bones", weight: 15 },
      { name: "Shrine Room", description: "Forgotten altar to unknown gods", weight: 10 },
      { name: "Tomb Antechamber", description: "Preparation room for burial rites", weight: 20 }
    ]
  },
  {
    name: "Flooded Caverns",
    description: "Water-logged natural caves and tunnels",
    roomTypes: [
      { name: "Shallow Pool", description: "Ankle-deep murky water covers the floor", weight: 25 },
      { name: "Dripping Cavern", description: "Water constantly drips from stalactites above", weight: 20 },
      { name: "Underground Stream", description: "A narrow stream flows through the chamber", weight: 15 },
      { name: "Flooded Tunnel", description: "Knee-deep water makes passage treacherous", weight: 20 },
      { name: "Muddy Chamber", description: "Thick mud and standing water throughout", weight: 20 }
    ]
  },
  {
    name: "Crystal Formations",
    description: "Glowing crystals and mineral deposits",
    roomTypes: [
      { name: "Crystal Garden", description: "Massive crystal formations jut from walls", weight: 20 },
      { name: "Geode Chamber", description: "Hollow space lined with sparkling gems", weight: 15 },
      { name: "Mineral Vein", description: "Precious metals streak through rock walls", weight: 25 },
      { name: "Glowing Cavern", description: "Luminescent crystals provide eerie light", weight: 20 },
      { name: "Crystal Bridge", description: "Natural crystal spans across a chasm", weight: 20 }
    ]
  },
  {
    name: "Fungal Grottos",
    description: "Mushroom forests and spore-filled chambers",
    roomTypes: [
      { name: "Mushroom Grove", description: "Giant fungi tower overhead like trees", weight: 25 },
      { name: "Spore Chamber", description: "Thick clouds of spores fill the air", weight: 20 },
      { name: "Mycelium Network", description: "Fungal threads connect walls and ceiling", weight: 20 },
      { name: "Rotting Garden", description: "Decomposing matter feeds massive mushrooms", weight: 15 },
      { name: "Fungal Throne", description: "A chair-like formation of hardened fungi", weight: 20 }
    ]
  },
  {
    name: "Mechanical Ruins",
    description: "Ancient clockwork and rusted machinery",
    roomTypes: [
      { name: "Gear Chamber", description: "Massive gears frozen in place", weight: 20 },
      { name: "Clockwork Hall", description: "Complex mechanical devices line the walls", weight: 20 },
      { name: "Steam Vents", description: "Hot steam rises from broken pipes", weight: 25 },
      { name: "Control Room", description: "Levers and switches for unknown purposes", weight: 15 },
      { name: "Engine Chamber", description: "A massive engine sits silent and cold", weight: 20 }
    ]
  },
  {
    name: "Elemental Chambers",
    description: "Rooms infused with elemental energy",
    roomTypes: [
      { name: "Fire Shrine", description: "Eternal flames burn without fuel", weight: 20 },
      { name: "Ice Chamber", description: "Frost covers every surface in the room", weight: 20 },
      { name: "Lightning Node", description: "Electric energy crackles through the air", weight: 20 },
      { name: "Wind Tunnel", description: "Powerful gusts blow through the passage", weight: 20 },
      { name: "Earth Sanctum", description: "Living stone slowly shifts and moves", weight: 20 }
    ]
  },
  {
    name: "Twisted Gardens",
    description: "Corrupted plant life and dark vegetation",
    roomTypes: [
      { name: "Thorn Maze", description: "Massive thorny vines block passages", weight: 25 },
      { name: "Poison Grove", description: "Sickly plants emit toxic vapors", weight: 20 },
      { name: "Root Chamber", description: "Thick roots burst through walls and floor", weight: 25 },
      { name: "Carnivorous Garden", description: "Plants with snapping jaws line the path", weight: 15 },
      { name: "Withered Conservatory", description: "Dead plants in ornate planters", weight: 15 }
    ]
  },
  {
    name: "Shadow Realm",
    description: "Dark void touched by otherworldly forces",
    roomTypes: [
      { name: "Void Chamber", description: "Darkness seems to absorb all light", weight: 25 },
      { name: "Shadow Portal", description: "Inky blackness swirls in the air", weight: 15 },
      { name: "Nightmare Hall", description: "Disturbing shapes move in the shadows", weight: 20 },
      { name: "Echo Chamber", description: "Sounds repeat endlessly in the darkness", weight: 20 },
      { name: "Umbral Nexus", description: "Multiple shadows converge at this point", weight: 20 }
    ]
  },
  {
    name: "The Abyss",
    description: "The deepest reaches where reality breaks down",
    roomTypes: [
      { name: "Reality Fracture", description: "Space and time seem unstable here", weight: 20 },
      { name: "Abyssal Pit", description: "Bottomless chasm descends into nothingness", weight: 15 },
      { name: "Chaos Chamber", description: "Physical laws don't seem to apply", weight: 20 },
      { name: "Final Sanctum", description: "The heart of the dungeon's power", weight: 10 },
      { name: "Void Bridge", description: "Narrow path over infinite darkness", weight: 35 }
    ]
  }
];

function getRandomRoomType(theme: FloorTheme) {
  const totalWeight = theme.roomTypes.reduce((sum, type) => sum + type.weight, 0);
  const random = Math.random() * totalWeight;
  let currentWeight = 0;
  
  for (const roomType of theme.roomTypes) {
    currentWeight += roomType.weight;
    if (random <= currentWeight) {
      return roomType;
    }
  }
  
  return theme.roomTypes[0]; // fallback
}

export async function generateFullDungeon() {
  console.log("Generating full 10-floor dungeon...");
  
  const GRID_SIZE = 20; // 20x20 grid = 400 potential positions per floor
  const MIN_ROOMS_PER_FLOOR = 200;
  const STAIRCASES_PER_FLOOR = 3;
  
  for (let floorNum = 1; floorNum <= 10; floorNum++) {
    console.log(`Generating Floor ${floorNum}...`);
    
    const theme = floorThemes[floorNum - 1];
    const floorId = floorNum;
    
    // Generate grid of rooms
    const roomPositions: Array<{x: number, y: number}> = [];
    
    // Create a connected maze-like structure
    for (let x = -GRID_SIZE/2; x < GRID_SIZE/2; x++) {
      for (let y = -GRID_SIZE/2; y < GRID_SIZE/2; y++) {
        // Skip some positions to create variety in the layout
        if (Math.random() > 0.45) continue; // ~55% room density
        roomPositions.push({x, y});
      }
    }
    
    // Ensure we have at least the minimum number of rooms
    while (roomPositions.length < MIN_ROOMS_PER_FLOOR) {
      const x = Math.floor(Math.random() * GRID_SIZE) - GRID_SIZE/2;
      const y = Math.floor(Math.random() * GRID_SIZE) - GRID_SIZE/2;
      if (!roomPositions.some(pos => pos.x === x && pos.y === y)) {
        roomPositions.push({x, y});
      }
    }
    
    console.log(`Floor ${floorNum}: Creating ${roomPositions.length} rooms`);
    
    // Create entrance room at (0,0)
    const entranceRoom = {
      floorId,
      x: 0,
      y: 0,
      name: `${theme.name} Entrance`,
      description: `Entry point to the ${theme.description.toLowerCase()}`,
      type: 'entrance',
      isSafe: floorNum === 1,
      isExplored: false,
      hasLoot: false
    };
    
    const roomsToInsert = [entranceRoom];
    
    // Ensure (0,0) is in our positions
    if (!roomPositions.some(pos => pos.x === 0 && pos.y === 0)) {
      roomPositions.push({x: 0, y: 0});
    }
    
    // Create staircase rooms
    const staircasePositions: Array<{x: number, y: number}> = [];
    for (let i = 0; i < STAIRCASES_PER_FLOOR && floorNum < 10; i++) {
      let staircasePos: {x: number, y: number};
      do {
        staircasePos = roomPositions[Math.floor(Math.random() * roomPositions.length)];
      } while (staircasePositions.some(pos => pos.x === staircasePos.x && pos.y === staircasePos.y) ||
               (staircasePos.x === 0 && staircasePos.y === 0));
      
      staircasePositions.push(staircasePos);
      
      roomsToInsert.push({
        floorId,
        x: staircasePos.x,
        y: staircasePos.y,
        name: `Descent to ${floorThemes[floorNum]?.name || 'Deeper Levels'}`,
        description: `Stairs leading down to level ${floorNum + 1}`,
        type: 'stairs',
        isSafe: false,
        isExplored: false,
        hasLoot: false
      });
    }
    
    // Create regular rooms
    for (const pos of roomPositions) {
      // Skip if we already created a special room here
      if ((pos.x === 0 && pos.y === 0) || 
          staircasePositions.some(sPos => sPos.x === pos.x && sPos.y === pos.y)) {
        continue;
      }
      
      const roomType = getRandomRoomType(theme);
      roomsToInsert.push({
        floorId,
        x: pos.x,
        y: pos.y,
        name: roomType.name,
        description: roomType.description,
        type: 'normal',
        isSafe: false,
        isExplored: false,
        hasLoot: false
      });
    }
    
    // Insert rooms in batches
    const BATCH_SIZE = 50;
    for (let i = 0; i < roomsToInsert.length; i += BATCH_SIZE) {
      const batch = roomsToInsert.slice(i, i + BATCH_SIZE);
      await db.insert(rooms).values(batch);
    }
    
    console.log(`Floor ${floorNum}: Inserted ${roomsToInsert.length} rooms`);
  }
  
  // Generate connections
  console.log("Generating room connections...");
  await generateConnections();
  
  console.log("Dungeon generation complete!");
}

async function generateConnections() {
  // Get all rooms grouped by floor
  const allRooms = await db.select().from(rooms);
  const roomsByFloor = new Map<number, typeof allRooms>();
  
  for (const room of allRooms) {
    if (!roomsByFloor.has(room.floorId)) {
      roomsByFloor.set(room.floorId, []);
    }
    roomsByFloor.get(room.floorId)!.push(room);
  }
  
  const connections: Array<{fromRoomId: number, toRoomId: number, direction: string}> = [];
  
  for (const [floorId, floorRooms] of Array.from(roomsByFloor.entries())) {
    console.log(`Connecting ${floorRooms.length} rooms on floor ${floorId}`);
    
    // Create a map for quick room lookup by coordinates
    const roomMap = new Map<string, typeof floorRooms[0]>();
    for (const room of floorRooms) {
      roomMap.set(`${room.x},${room.y}`, room);
    }
    
    // Connect adjacent rooms
    for (const room of floorRooms) {
      const directions = [
        { dx: 0, dy: 1, dir: 'north', opposite: 'south' },
        { dx: 0, dy: -1, dir: 'south', opposite: 'north' },
        { dx: 1, dy: 0, dir: 'east', opposite: 'west' },
        { dx: -1, dy: 0, dir: 'west', opposite: 'east' }
      ];
      
      for (const {dx, dy, dir, opposite} of directions) {
        const adjacentKey = `${room.x + dx},${room.y + dy}`;
        const adjacentRoom = roomMap.get(adjacentKey);
        
        if (adjacentRoom) {
          connections.push({
            fromRoomId: room.id,
            toRoomId: adjacentRoom.id,
            direction: dir
          });
          connections.push({
            fromRoomId: adjacentRoom.id,
            toRoomId: room.id,
            direction: opposite
          });
        }
      }
    }
  }
  
  // Remove duplicates
  const uniqueConnections = connections.filter((conn, index, arr) => 
    arr.findIndex(c => c.fromRoomId === conn.fromRoomId && 
                      c.toRoomId === conn.toRoomId && 
                      c.direction === conn.direction) === index
  );
  
  // Insert connections in batches
  const BATCH_SIZE = 100;
  for (let i = 0; i < uniqueConnections.length; i += BATCH_SIZE) {
    const batch = uniqueConnections.slice(i, i + BATCH_SIZE);
    await db.insert(roomConnections).values(batch);
  }
  
  console.log(`Generated ${uniqueConnections.length} room connections`);
}