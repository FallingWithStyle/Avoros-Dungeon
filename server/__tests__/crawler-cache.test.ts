
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { redisService } from '../lib/redis-service';
import { CrawlerStorage } from '../storage/crawler-storage';
import { db } from '../db';
import { crawlers, crawlerClasses } from '@shared/schema';

describe('Crawler Cache Integration Tests', () => {
  let crawlerStorage: CrawlerStorage;
  let testCrawlerId: number;

  beforeEach(async () => {
    crawlerStorage = new CrawlerStorage();
    
    // Create a test crawler
    const [testClass] = await db.select().from(crawlerClasses).limit(1);
    const [testCrawler] = await db.insert(crawlers).values({
      sponsorId: 'test-user',
      name: 'Test Crawler',
      serial: '12345',
      classId: testClass.id,
      background: 'Test background',
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
    }).returning();
    
    testCrawlerId = testCrawler.id;
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(crawlers).where({ id: testCrawlerId });
    await redisService.invalidateCrawler(testCrawlerId);
  });

  it('should cache crawler data on first fetch', async () => {
    // First fetch - should hit database and cache
    const crawler1 = await crawlerStorage.getCrawler(testCrawlerId);
    expect(crawler1).toBeTruthy();

    // Verify data is now in cache
    const cached = await redisService.getCrawler(testCrawlerId);
    expect(cached).toBeTruthy();
    expect(cached.id).toBe(testCrawlerId);
    expect(cached.name).toBe('Test Crawler');
  });

  it('should return cached data on subsequent fetches', async () => {
    // First fetch to populate cache
    await crawlerStorage.getCrawler(testCrawlerId);

    // Manually modify cache to verify it's being used
    const modifiedData = { id: testCrawlerId, name: 'Cached Crawler', isCached: true };
    await redisService.setCrawler(testCrawlerId, modifiedData, 60);

    // Second fetch should return cached data
    const crawler2 = await crawlerStorage.getCrawler(testCrawlerId);
    expect(crawler2.name).toBe('Cached Crawler');
    expect(crawler2.isCached).toBe(true);
  });

  it('should invalidate cache when crawler is updated', async () => {
    // Populate cache
    await crawlerStorage.getCrawler(testCrawlerId);
    
    // Verify cache exists
    let cached = await redisService.getCrawler(testCrawlerId);
    expect(cached).toBeTruthy();

    // Update crawler
    await crawlerStorage.updateCrawler(testCrawlerId, { health: 90 });

    // Verify cache is invalidated
    cached = await redisService.getCrawler(testCrawlerId);
    expect(cached).toBeNull();
  });

  it('should handle Redis unavailable gracefully', async () => {
    // Simulate Redis being unavailable by temporarily disabling it
    const originalRedis = redisService['redis'];
    redisService['redis'] = null;

    try {
      // Should still work, just without caching
      const crawler = await crawlerStorage.getCrawler(testCrawlerId);
      expect(crawler).toBeTruthy();
      expect(crawler.name).toBe('Test Crawler');
    } finally {
      // Restore Redis connection
      redisService['redis'] = originalRedis;
    }
  });
});
