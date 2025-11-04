import { SignatureExpirationService } from './signatureExpirationService';

export class SignatureScheduler {
  private service: SignatureExpirationService;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;

  constructor() {
    this.service = new SignatureExpirationService();
  }

  /**
   * Start the scheduler to check for expiring signatures every 6 hours
   */
  start(intervalHours: number = 6): void {
    if (this.isRunning) {
      console.log('[SignatureScheduler] Already running');
      return;
    }

    const intervalMs = intervalHours * 60 * 60 * 1000;
    console.log(`[SignatureScheduler] Starting with ${intervalHours} hour interval`);

    // Run immediately on start
    this.runCheck().catch(error => {
      console.error('[SignatureScheduler] Error in initial check:', error);
    });

    // Then run at intervals
    this.intervalId = setInterval(() => {
      this.runCheck().catch(error => {
        console.error('[SignatureScheduler] Error in scheduled check:', error);
      });
    }, intervalMs);

    this.isRunning = true;
    console.log('[SignatureScheduler] Started successfully');
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('[SignatureScheduler] Stopped');
  }

  /**
   * Run the expiration check manually
   */
  async runCheck(dbEnv: string = 'development'): Promise<any> {
    console.log(`[SignatureScheduler] Running expiration check at ${new Date().toISOString()}`);
    
    try {
      const results = await this.service.processExpiringSignatures(dbEnv);
      console.log('[SignatureScheduler] Check completed:', results);
      return results;
    } catch (error) {
      console.error('[SignatureScheduler] Check failed:', error);
      throw error;
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): { isRunning: boolean; lastCheck: string | null } {
    return {
      isRunning: this.isRunning,
      lastCheck: new Date().toISOString()
    };
  }
}

// Export a singleton instance
export const signatureScheduler = new SignatureScheduler();
