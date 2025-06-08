
import { db } from './server/db.js';
import { crawlers, crawlerPositions, rooms } from './shared/schema.js';
import { eq } from 'drizzle-orm';

(async () => {
  console.log('=== CRAWLER POSITIONS DEBUG ===');
  
  try {
    // Check if we have any crawlers
    const allCrawlers = await db.select().from(crawlers);
    console.log('Total crawlers:', allCrawlers.length);
    
    if (allCrawlers.length > 0) {
      const crawler = allCrawlers[0];
      console.log('First crawler ID:', crawler.id);
      console.log('Crawler name:', crawler.name);
      console.log('Crawler sponsor:', crawler.sponsorId);
      
      // Check if this crawler has any positions
      const positions = await db.select().from(crawlerPositions).where(eq(crawlerPositions.crawlerId, crawler.id));
      console.log('Positions for crawler', crawler.id + ':', positions.length);
      
      if (positions.length > 0) {
        console.log('Latest position:', positions[0]);
      } else {
        console.log('❌ No positions found for crawler - this is the problem!');
      }
    } else {
      console.log('❌ No crawlers found in database');
    }
    
    // Check if we have any entrance rooms
    const entranceRooms = await db.select().from(rooms).where(eq(rooms.type, 'entrance'));
    console.log('Entrance rooms found:', entranceRooms.length);
    
    if (entranceRooms.length > 0) {
      console.log('First entrance room:', entranceRooms[0]);
    }
    
    // Check if we have any rooms at all
    const allRooms = await db.select().from(rooms).limit(5);
    console.log('Sample rooms:', allRooms.length);
    
  } catch (error) {
    console.error('Error during debug:', error);
  }
  
  process.exit(0);
})();
