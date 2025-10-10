/**
 * WaitForHelper - Auto-wait mechanism for interactions
 * Implements chrome-devtools-mcp's waitForEventsAfterAction pattern
 * 
 * Automatically waits for:
 * 1. Navigation to complete (if triggered)
 * 2. DOM to stabilize (using MutationObserver)
 */

import type { Page } from 'puppeteer-core';

export class WaitForHelper {
  private abortController = new AbortController();
  private page: Page;
  private stableDomTimeout: number;
  private stableDomFor: number;
  private expectNavigationIn: number;
  private navigationTimeout: number;

  constructor(
    page: Page,
    cpuTimeoutMultiplier: number = 1,
    networkTimeoutMultiplier: number = 1
  ) {
    this.page = page;
    this.stableDomTimeout = 3000 * cpuTimeoutMultiplier;
    this.stableDomFor = 100 * cpuTimeoutMultiplier;
    this.expectNavigationIn = 100 * cpuTimeoutMultiplier;
    this.navigationTimeout = 3000 * networkTimeoutMultiplier;
  }

  /**
   * Execute action and wait for all events to settle
   * This is the core method that wraps all interactions
   */
  async waitForEventsAfterAction(
    action: () => Promise<unknown>
  ): Promise<void> {
    // 1. Start monitoring for navigation
    const navigationFinished = this.waitForNavigationStarted()
      .then(navigationStarted => {
        if (navigationStarted) {
          return this.page.waitForNavigation({
            timeout: this.navigationTimeout,
            waitUntil: 'load'
          }).catch(err => {
            console.warn('[WaitForHelper] Navigation wait error:', err.message);
          });
        }
        return Promise.resolve();
      })
      .catch(error => {
        console.warn('[WaitForHelper] Navigation detection error:', error.message);
      });

    try {
      // 2. Execute the action
      await action();
    } catch (error) {
      // Clear pending promises and rethrow
      this.abortController.abort();
      throw error;
    }

    try {
      // 3. Wait for navigation to complete (if any)
      await navigationFinished;

      // 4. Wait for DOM to stabilize
      await this.waitForStableDom();
    } catch (error) {
      console.warn('[WaitForHelper] Post-action wait error:', error.message);
    } finally {
      this.abortController.abort();
      // Reset for next use
      this.abortController = new AbortController();
    }
  }

  /**
   * Detect if navigation is about to start
   * Returns true if navigation detected, false otherwise
   */
  private async waitForNavigationStarted(): Promise<boolean> {
    return new Promise<boolean>(resolve => {
      try {
        // Access CDP client for frame navigation events
        const cdpSession = (this.page as any)._client?.() || (this.page as any)._client;
        
        if (!cdpSession || !cdpSession.on) {
          // CDP not available, assume no navigation
          resolve(false);
          return;
        }

        const listener = (event: any) => {
          // Ignore same-document navigation (e.g., hash changes)
          if (
            event.navigationType === 'historySameDocument' ||
            event.navigationType === 'historyDifferentDocument' ||
            event.navigationType === 'sameDocument'
          ) {
            resolve(false);
            return;
          }

          // Real navigation detected
          resolve(true);
        };

        cdpSession.on('Page.frameStartedNavigating', listener);

        // Cleanup listener on abort
        this.abortController.signal.addEventListener('abort', () => {
          if (cdpSession && cdpSession.off) {
            cdpSession.off('Page.frameStartedNavigating', listener);
          }
          resolve(false);
        });

        // Timeout: assume no navigation after expectNavigationIn ms
        setTimeout(() => {
          if (cdpSession && cdpSession.off) {
            cdpSession.off('Page.frameStartedNavigating', listener);
          }
          resolve(false);
        }, this.expectNavigationIn);
      } catch (error) {
        console.warn('[WaitForHelper] Navigation detection setup failed:', error);
        resolve(false);
      }
    });
  }

  /**
   * Wait for DOM to stabilize using MutationObserver
   * Resolves when DOM is unchanged for stableDomFor ms
   */
  private async waitForStableDom(): Promise<void> {
    try {
      // Inject MutationObserver in page context
      const stableDomObserver = await this.page.evaluateHandle(
        (timeout: number) => {
          let timeoutId: ReturnType<typeof setTimeout>;

          function callback() {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
              domObserver.resolver.resolve();
              domObserver.observer.disconnect();
            }, timeout);
          }

          // Create promise with resolvers (compatible with older browsers)
          let resolveFunc: any;
          let rejectFunc: any;
          const promise = new Promise<void>((resolve, reject) => {
            resolveFunc = resolve;
            rejectFunc = reject;
          });
          
          const domObserver = {
            resolver: {
              promise,
              resolve: resolveFunc,
              reject: rejectFunc
            },
            observer: new MutationObserver(callback)
          };

          // Start observing DOM changes
          domObserver.observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true
          });

          // Initial timeout (in case DOM is already stable)
          callback();

          return domObserver;
        },
        this.stableDomFor
      );

      // Listen for abort signal
      this.abortController.signal.addEventListener('abort', async () => {
        try {
          await stableDomObserver.evaluate(observer => {
            observer.observer.disconnect();
            observer.resolver.resolve();
          });
          await stableDomObserver.dispose();
        } catch {
          // Ignore cleanup errors
        }
      });

      // Wait for DOM to stabilize or timeout
      await Promise.race([
        stableDomObserver.evaluate(async observer => {
          return await observer.resolver.promise;
        }),
        this.timeout(this.stableDomTimeout).then(() => {
          throw new Error('DOM stabilization timeout');
        })
      ]);

      // Cleanup
      try {
        await stableDomObserver.dispose();
      } catch {
        // Ignore disposal errors
      }
    } catch (error) {
      if (error.message === 'DOM stabilization timeout') {
        console.warn('[WaitForHelper] DOM did not stabilize within timeout');
      } else {
        console.warn('[WaitForHelper] Stable DOM wait failed:', error.message);
      }
    }
  }

  /**
   * Create a timeout promise that respects abort signal
   */
  private timeout(time: number): Promise<void> {
    return new Promise<void>(resolve => {
      const id = setTimeout(resolve, time);
      this.abortController.signal.addEventListener('abort', () => {
        resolve();
        clearTimeout(id);
      });
    });
  }

  /**
   * Create a new WaitForHelper for a page with optional multipliers
   */
  static create(
    page: Page,
    cpuMultiplier?: number,
    networkMultiplier?: number
  ): WaitForHelper {
    return new WaitForHelper(page, cpuMultiplier, networkMultiplier);
  }
}

