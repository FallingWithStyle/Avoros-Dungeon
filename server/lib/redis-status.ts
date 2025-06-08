
export class RedisStatus {
  private static instance: RedisStatus;
  private isRedisAvailable = false;
  private lastCheckTime = 0;
  private checkInterval = 30000; // Check every 30 seconds
  private listeners: Array<(status: boolean) => void> = [];

  static getInstance(): RedisStatus {
    if (!RedisStatus.instance) {
      RedisStatus.instance = new RedisStatus();
    }
    return RedisStatus.instance;
  }

  private constructor() {
    this.checkRedisStatus();
  }

  private async checkRedisStatus(): Promise<void> {
    const now = Date.now();
    if (now - this.lastCheckTime < this.checkInterval) {
      return;
    }

    try {
      // Try a simple Redis operation
      const { redisService } = await import('./redis-service');
      await redisService.set('health-check', 'ok', 10);
      const result = await redisService.get('health-check');
      
      const newStatus = result === 'ok';
      if (newStatus !== this.isRedisAvailable) {
        this.isRedisAvailable = newStatus;
        this.notifyListeners(newStatus);
      }
      this.lastCheckTime = now;
    } catch (error) {
      if (this.isRedisAvailable) {
        this.isRedisAvailable = false;
        this.notifyListeners(false);
      }
      this.lastCheckTime = now;
    }
  }

  async getStatus(): Promise<boolean> {
    await this.checkRedisStatus();
    return this.isRedisAvailable;
  }

  onStatusChange(callback: (status: boolean) => void): void {
    this.listeners.push(callback);
  }

  private notifyListeners(status: boolean): void {
    this.listeners.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('Error notifying Redis status listener:', error);
      }
    });
  }
}

export const redisStatus = RedisStatus.getInstance();
