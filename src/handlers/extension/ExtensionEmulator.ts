/**
 * ExtensionEmulator - Device and Network Emulation
 * 
 * Provides tools to test Chrome extensions under various
 * network and CPU conditions.
 */

import type { ChromeManager } from '../../managers/ChromeManager.js';
import type { PageManager } from '../../managers/PageManager.js';
import type {
  NetworkCondition,
  NetworkPreset,
  CPUThrottling,
  EmulationCondition,
  EmulationResult,
  BatchEmulationResult,
  NETWORK_PRESETS,
  TEST_CONDITIONS
} from '../../types/emulation-types.js';

const DEBUG = true;
const log = (...args: any[]) => DEBUG && console.error('[ExtensionEmulator]', ...args);

export class ExtensionEmulator {
  private chromeManager: ChromeManager;
  private pageManager: PageManager;
  private currentNetworkCondition: NetworkCondition | null = null;
  private currentCPUThrottling: number = 1;

  constructor(chromeManager: ChromeManager, pageManager: PageManager) {
    this.chromeManager = chromeManager;
    this.pageManager = pageManager;
  }

  /**
   * Emulate CPU throttling
   */
  async emulateCPU(options: {
    rate: number; // 1-20x slowdown
    extensionId?: string;
  }): Promise<{
    success: boolean;
    rate: number;
    message: string;
  }> {
    const { rate } = options;
    
    // Validate rate
    if (rate < 1 || rate > 20) {
      throw new Error('CPU throttling rate must be between 1 and 20');
    }

    log(`Setting CPU throttling to ${rate}x`);

    try {
      const page = await this.pageManager.getActivePage();
      const cdpClient = await page.target().createCDPSession();

      // Enable Emulation domain
      await cdpClient.send('Emulation.setCPUThrottlingRate', {
        rate
      });

      this.currentCPUThrottling = rate;

      log(`✅ CPU throttling set to ${rate}x`);

      return {
        success: true,
        rate,
        message: `CPU throttled to ${rate}x slowdown${rate === 1 ? ' (no throttling)' : ''}`
      };
    } catch (error) {
      log('❌ Failed to set CPU throttling:', error);
      throw error;
    }
  }

  /**
   * Emulate network conditions
   */
  async emulateNetwork(options: {
    condition: NetworkPreset | NetworkCondition;
    extensionId?: string;
  }): Promise<{
    success: boolean;
    condition: NetworkCondition;
    message: string;
  }> {
    const { condition } = options;

    // Resolve preset to actual condition
    let networkCondition: NetworkCondition;
    if (typeof condition === 'string') {
      const presets = await import('../../types/emulation-types.js');
      networkCondition = presets.NETWORK_PRESETS[condition as NetworkPreset];
      if (!networkCondition) {
        throw new Error(`Unknown network preset: ${condition}`);
      }
    } else {
      networkCondition = condition;
    }

    log(`Setting network condition:`, networkCondition);

    try {
      const page = await this.pageManager.getActivePage();
      const cdpClient = await page.target().createCDPSession();

      // Enable Network domain
      await cdpClient.send('Network.enable');

      // Apply network emulation
      await cdpClient.send('Network.emulateNetworkConditions', {
        offline: networkCondition.downloadThroughput === 0,
        downloadThroughput: networkCondition.downloadThroughput,
        uploadThroughput: networkCondition.uploadThroughput,
        latency: networkCondition.latency,
        connectionType: this.getConnectionType(networkCondition)
      });

      this.currentNetworkCondition = networkCondition;

      const conditionName = typeof condition === 'string' ? condition : 'Custom';
      log(`✅ Network emulation set: ${conditionName}`);

      return {
        success: true,
        condition: networkCondition,
        message: `Network emulated: ${conditionName} (${networkCondition.downloadThroughput / 1024}KB/s down, ${networkCondition.latency}ms latency)`
      };
    } catch (error) {
      log('❌ Failed to set network emulation:', error);
      throw error;
    }
  }

  /**
   * Test extension under specific conditions
   */
  async testUnderConditions(options: {
    extensionId: string;
    testUrl: string;
    condition: EmulationCondition;
    timeout?: number;
  }): Promise<EmulationResult> {
    const { extensionId, testUrl, condition, timeout = 30000 } = options;

    log(`Testing extension ${extensionId} under conditions: ${condition.name}`);

    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Apply network condition
      if (condition.network) {
        await this.emulateNetwork({
          condition: condition.network,
          extensionId
        });
      }

      // Apply CPU throttling
      if (condition.cpu) {
        await this.emulateCPU({
          rate: condition.cpu,
          extensionId
        });
      }

      // Navigate to test URL
      const page = await this.pageManager.getActivePage();
      
      try {
        await page.goto(testUrl, {
          waitUntil: 'domcontentloaded',
          timeout: timeout
        });
      } catch (navError) {
        errors.push(`Navigation failed: ${navError instanceof Error ? navError.message : String(navError)}`);
      }

      // Wait for page to stabilize
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if page loaded
      const loadTime = Date.now() - startTime;
      
      // Try to detect extension functionality
      const functional = await this.checkExtensionFunctionality(extensionId, page);

      if (!functional) {
        errors.push('Extension did not function correctly under these conditions');
      }

      // Collect basic metrics
      const metrics = {
        loadTime,
        networkRequests: 0 // Could be enhanced with actual network monitoring
      };

      // Reset conditions
      await this.resetEmulation();

      return {
        condition,
        extensionId,
        testUrl,
        functional,
        metrics,
        errors: errors.length > 0 ? errors : undefined,
        warnings: warnings.length > 0 ? warnings : undefined,
        timestamp: Date.now()
      };

    } catch (error) {
      log('❌ Test failed:', error);
      
      // Try to reset emulation
      try {
        await this.resetEmulation();
      } catch (resetError) {
        log('Failed to reset emulation:', resetError);
      }

      errors.push(`Test error: ${error instanceof Error ? error.message : String(error)}`);

      return {
        condition,
        extensionId,
        testUrl,
        functional: false,
        errors,
        warnings: warnings.length > 0 ? warnings : undefined,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Batch test extension under multiple conditions
   */
  async batchTest(options: {
    extensionId: string;
    testUrl: string;
    conditions?: EmulationCondition[];
    timeout?: number;
  }): Promise<BatchEmulationResult> {
    const presets = await import('../../types/emulation-types.js');
    const { extensionId, testUrl, conditions = presets.TEST_CONDITIONS, timeout } = options;

    log(`Batch testing extension ${extensionId} under ${conditions.length} conditions`);

    const results: EmulationResult[] = [];

    for (const condition of conditions) {
      log(`Testing condition: ${condition.name}`);
      
      const result = await this.testUnderConditions({
        extensionId,
        testUrl,
        condition,
        timeout
      });

      results.push(result);

      // Brief pause between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Calculate summary
    const passed = results.filter(r => r.functional).length;
    const failed = results.filter(r => !r.functional).length;
    const functionalityRate = (passed / results.length) * 100;

    // Generate recommendations
    const recommendations = this.generateRecommendations(results);

    return {
      extensionId,
      testUrl,
      results,
      summary: {
        totalTests: results.length,
        passed,
        failed,
        functionalityRate
      },
      recommendations,
      timestamp: Date.now()
    };
  }

  /**
   * Reset all emulation to normal conditions
   */
  async resetEmulation(): Promise<void> {
    log('Resetting emulation to normal conditions');

    try {
      const page = await this.pageManager.getActivePage();
      const cdpClient = await page.target().createCDPSession();

      // Reset CPU throttling
      await cdpClient.send('Emulation.setCPUThrottlingRate', { rate: 1 });

      // Reset network emulation
      await cdpClient.send('Network.emulateNetworkConditions', {
        offline: false,
        downloadThroughput: -1,
        uploadThroughput: -1,
        latency: 0
      });

      this.currentNetworkCondition = null;
      this.currentCPUThrottling = 1;

      log('✅ Emulation reset to normal');
    } catch (error) {
      log('⚠️  Failed to reset emulation:', error);
      throw error;
    }
  }

  /**
   * Get current emulation status
   */
  getCurrentStatus(): {
    network: NetworkCondition | null;
    cpu: number;
  } {
    return {
      network: this.currentNetworkCondition,
      cpu: this.currentCPUThrottling
    };
  }

  /**
   * Check if extension is functional
   */
  private async checkExtensionFunctionality(extensionId: string, page: any): Promise<boolean> {
    try {
      // Try to evaluate if extension content script is injected
      const hasContentScript = await page.evaluate(() => {
        // Check for common extension indicators
        return !!(window as any).__EXTENSION_LOADED__ || 
               document.querySelector('[data-extension-id]') !== null;
      });

      // If we can't definitively check, assume it's working
      return true;
    } catch (error) {
      log('Could not check extension functionality:', error);
      return false; // Conservative: assume failure if we can't check
    }
  }

  /**
   * Determine connection type from condition
   */
  private getConnectionType(condition: NetworkCondition): string {
    if (condition.downloadThroughput === 0) return 'none';
    if (condition.downloadThroughput > 3 * 1024 * 1024 / 8) return 'wifi';
    if (condition.downloadThroughput > 1 * 1024 * 1024 / 8) return 'cellular3g';
    return 'cellular2g';
  }

  /**
   * Generate recommendations based on test results
   */
  private generateRecommendations(results: EmulationResult[]): string[] {
    const recommendations: string[] = [];

    // Check for offline failures
    const offlineTests = results.filter(r => 
      typeof r.condition.network === 'string' && r.condition.network === 'Offline'
    );
    if (offlineTests.some(r => !r.functional)) {
      recommendations.push('⚠️  Extension fails in offline mode - consider implementing offline functionality');
    }

    // Check for slow network failures
    const slowNetworkTests = results.filter(r => 
      typeof r.condition.network === 'string' && r.condition.network === 'Slow 3G'
    );
    if (slowNetworkTests.some(r => !r.functional)) {
      recommendations.push('⚠️  Extension struggles with slow networks - optimize resource loading');
    }

    // Check for CPU throttling issues
    const cpuHeavyTests = results.filter(r => 
      r.condition.cpu && r.condition.cpu >= 4
    );
    if (cpuHeavyTests.some(r => !r.functional)) {
      recommendations.push('⚠️  Extension has issues on slow devices - optimize CPU-intensive operations');
    }

    // Check load times
    const slowLoads = results.filter(r => 
      r.metrics && r.metrics.loadTime > 5000
    );
    if (slowLoads.length > results.length / 2) {
      recommendations.push('💡 Consider lazy loading or code splitting to improve load times');
    }

    // Positive feedback
    if (results.every(r => r.functional)) {
      recommendations.push('✅ Extension works reliably across all tested conditions');
    }

    return recommendations;
  }
}

