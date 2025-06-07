
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { redisService } from '../lib/redis-service';
import { storage } from '../storage';
import { db } from '../db';
import { crawlers, crawlerClasses } from '@shared/schema';
import { eq } from 'drizzle-orm';

describe('Crawler Performance Benchmarks', () => {
  const crawlerStorage = storage;
  let testCrawlerId: number;

  beforeEach(async () => {
    // Create a test crawler
    const [testClass] = await db.select().from(crawlerClasses).limit(1);
    const [testCrawler] = await db.insert(crawlers).values({
      sponsorId: 'test-user-perf',
      name: 'Performance Test Crawler',
      serial: 54321,
      classId: testClass.id,
      background: 'Performance test',
      health: 100,
      maxHealth: 100,
      attack: 10,
      defense: 8,
      speed: 6,
      wit: 7,
      charisma: 5,
      memory: 9,
      luck: 3,
      currentFloor: 1,
      energy: 50,
      maxEnergy: 50,
      experience: 0,
      level: 1,
      credits: 1000,
      isAlive: true,
      competencies: [],
    }).returning();
    
    testCrawlerId = testCrawler.id;
  });

  afterEach(async () => {
    await db.delete(crawlers).where(eq(crawlers.id, testCrawlerId));
    await redisService.invalidateCrawler(testCrawlerId);
  });

  it('should show performance improvement with caching', async () => {
    const iterations = 10;
    
    // Benchmark: Database-only (clear cache first)
    await redisService.invalidateCrawler(testCrawlerId);
    
    const dbStart = Date.now();
    for (let i = 0; i < iterations; i++) {
      await redisService.invalidateCrawler(testCrawlerId);
      await storage.getCrawler(testCrawlerId);
    }
    const dbTime = Date.now() - dbStart;

    // Benchmark: With caching (first call populates cache)
    await storage.getCrawler(testCrawlerId); // Prime the cache
    
    const cacheStart = Date.now();
    for (let i = 0; i < iterations; i++) {
      await storage.getCrawler(testCrawlerId);
    }
    const cacheTime = Date.now() - cacheStart;

    console.log(`Database-only: ${dbTime}ms for ${iterations} calls`);
    console.log(`With cache: ${cacheTime}ms for ${iterations} calls`);
    console.log(`Performance improvement: ${((dbTime - cacheTime) / dbTime * 100).toFixed(1)}%`);

    // Cache should be significantly faster (at least 2x)
    expect(cacheTime).toBeLessThan(dbTime / 2);
  }, 15000); // Extended timeout for performance test
});
