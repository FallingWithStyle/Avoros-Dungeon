export interface TacticalEntity {
  id: string;
  name: string;
  type: 'mob' | 'npc' | 'loot' | 'environmental';
  x: number;
  y: number;
  hp?: number;
  maxHp?: number;
  status?: string;
  properties?: Record<string, any>;
}

export interface PersistentTacticalData {
  mobs: TacticalEntity[];
  npcs: TacticalEntity[];
  loot: TacticalEntity[];
  environmental: TacticalEntity[];
}

export async function generatePersistentTacticalData(roomData: any): Promise<PersistentTacticalData> {
  try {
    // First, try to get persistent room state from the server
    const response = await fetch(`/api/rooms/${roomData?.room?.id}/state`);

    if (response.ok) {
      const roomState = await response.json();
      return convertRoomStateToTacticalData(roomState);
    }
  } catch (error) {
    console.warn("Failed to fetch persistent room state, generating fresh data:", error);
  }

  // Fallback to generating fresh data
  return generateFreshTacticalData(roomData);
}

function convertRoomStateToTacticalData(roomState: any): PersistentTacticalData {
  return {
    mobs: (roomState.mobData || []).map((mob: any) => ({
      id: `mob-${mob.id}`,
      name: mob.name,
      type: 'mob' as const,
      x: parseFloat(mob.positionX),
      y: parseFloat(mob.positionY),
      hp: mob.health,
      maxHp: mob.maxHealth,
      status: mob.status,
      properties: {
        attack: mob.attack,
        defense: mob.defense,
        mobType: mob.mobType,
      }
    })),
    npcs: (roomState.npcData || []).map((npc: any, index: number) => ({
      id: `npc-${index}`,
      name: npc.name,
      type: 'npc' as const,
      x: npc.x,
      y: npc.y,
      properties: npc.properties || {}
    })),
    loot: (roomState.lootData || []).map((loot: any, index: number) => ({
      id: `loot-${index}`,
      name: loot.name,
      type: 'loot' as const,
      x: loot.x,
      y: loot.y,
      properties: loot.properties || {}
    })),
    environmental: (roomState.environmentData?.entities || []).map((env: any, index: number) => ({
      id: `env-${index}`,
      name: env.name,
      type: 'environmental' as const,
      x: env.x,
      y: env.y,
      properties: env.properties || {}
    }))
  };
}

function generateFreshTacticalData(roomData: any): PersistentTacticalData {
  const room = roomData?.room;
  const mobs: TacticalEntity[] = [];
  const npcs: TacticalEntity[] = [];
  const loot: TacticalEntity[] = [];
  const environmental: TacticalEntity[] = [];

  // Generate mobs based on room type and floor
  const mobCount = room?.type === 'boss' ? 1 : 
                   room?.type === 'treasure' ? 0 : 
                   Math.floor(Math.random() * 3) + 1;

  for (let i = 0; i < mobCount; i++) {
    mobs.push({
      id: `mob-${i}`,
      name: generateMobName(room),
      type: 'mob',
      x: 20 + Math.random() * 60,
      y: 20 + Math.random() * 60,
      hp: 50 + Math.floor(Math.random() * 50),
      maxHp: 100,
      status: 'alive',
      properties: {
        attack: 10 + Math.floor(Math.random() * 10),
        defense: 5 + Math.floor(Math.random() * 5),
        mobType: getMobTypeForRoom(room)
      }
    });
  }

  // Generate NPCs occasionally
  if (Math.random() < 0.2) {
    npcs.push({
      id: 'npc-0',
      name: generateNpcName(room),
      type: 'npc',
      x: 30 + Math.random() * 40,
      y: 30 + Math.random() * 40,
      properties: {
        dialogue: ["Greetings, crawler...", "This place holds many secrets."],
        services: ["information"]
      }
    });
  }

  // Generate loot in treasure rooms or randomly
  if (room?.type === 'treasure' || Math.random() < 0.3) {
    loot.push({
      id: 'loot-0',
      name: room?.type === 'treasure' ? 'Treasure Chest' : 'Supply Cache',
      type: 'loot',
      x: 40 + Math.random() * 20,
      y: 40 + Math.random() * 20,
      properties: {
        lootType: room?.type === 'treasure' ? 'treasure' : 'supplies',
        value: room?.type === 'treasure' ? 'high' : 'medium'
      }
    });
  }

  return { mobs, npcs, loot, environmental };
}

function generateMobName(room: any): string {
  const mobTypes = getMobTypesForEnvironment(room?.environment);
  const mobType = mobTypes[Math.floor(Math.random() * mobTypes.length)];
  const adjectives = ['Fierce', 'Ancient', 'Corrupted', 'Feral', 'Wandering'];
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  return `${adjective} ${mobType}`;
}

function generateNpcName(room: any): string {
  const names = ['Mysterious Scholar', 'Wounded Explorer', 'Ancient Guardian', 'Lost Trader'];
  return names[Math.floor(Math.random() * names.length)];
}

function getMobTypeForRoom(room: any): string {
  const mobTypes = getMobTypesForEnvironment(room?.environment);
  return mobTypes[Math.floor(Math.random() * mobTypes.length)];
}

function getMobTypesForEnvironment(environment: string): string[] {
  switch (environment) {
    case 'outdoor':
      return ['Wolf', 'Bear', 'Bandit', 'Wild Boar'];
    case 'underground':
      return ['Goblin', 'Rat', 'Skeleton', 'Spider'];
    case 'indoor':
    default:
      return ['Guard', 'Cultist', 'Construct', 'Wraith'];
  }
}

export async function saveTacticalDataChanges(roomId: number, tacticalData: PersistentTacticalData): Promise<void> {
  try {
    await fetch(`/api/rooms/${roomId}/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mobData: tacticalData.mobs,
        npcData: tacticalData.npcs,
        lootData: tacticalData.loot,
        environmentData: { entities: tacticalData.environmental }
      })
    });
  } catch (error) {
    console.error("Failed to save tactical data changes:", error);
  }
}