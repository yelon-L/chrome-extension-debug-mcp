/**
 * DOMSnapshotHandler - DOM Snapshot Handler
 * Uses Puppeteer's native accessibility.snapshot() API
 * Inspired by chrome-devtools-mcp implementation
 */

import type { Page, ElementHandle } from 'puppeteer-core';

export class DOMSnapshotHandler {
  private snapshotIdCounter = 1;
  private currentUidMap: Map<string, any> = new Map();

  /**
   * Create a text snapshot using Puppeteer's accessibility API
   * This is much faster than manual DOM traversal
   */
  async createTextSnapshot(page: Page): Promise<{
    snapshot: string;
    snapshotId: string;
    uidMap: Map<string, any>;
  }> {
    const snapshotId = String(this.snapshotIdCounter++);
    
    try {
      // Use Puppeteer's native accessibility snapshot
      const axSnapshot = await page.accessibility.snapshot();
      
      if (!axSnapshot) {
        return {
          snapshot: 'No snapshot available',
          snapshotId,
          uidMap: new Map()
        };
      }
      
      // Build UID mapping
      const uidMap = new Map<string, any>();
      let uidCounter = 0;
      
      // Recursively add UIDs to nodes
      const enrichWithUids = (node: any, parentUid?: string): any => {
        const uid = `${snapshotId}_${uidCounter++}`;
        const enrichedNode = {
          ...node,
          uid,
          parentUid
        };
        
        uidMap.set(uid, enrichedNode);
        
        if (node.children) {
          enrichedNode.children = node.children.map((child: any) => 
            enrichWithUids(child, uid)
          );
        }
        
        return enrichedNode;
      };
      
      const enrichedSnapshot = enrichWithUids(axSnapshot);
      
      // Format to markdown text
      const formatted = this.formatA11ySnapshot(enrichedSnapshot);
      
      // Store current UID map for getElementByUid
      this.currentUidMap = uidMap;
      
      return {
        snapshot: formatted,
        snapshotId,
        uidMap
      };
    } catch (error) {
      console.error('[DOMSnapshotHandler] Snapshot creation failed:', error);
      return {
        snapshot: `Error creating snapshot: ${error.message}`,
        snapshotId,
        uidMap: new Map()
      };
    }
  }

  /**
   * Format accessibility snapshot to markdown
   * Based on chrome-devtools-mcp's formatA11ySnapshot
   */
  private formatA11ySnapshot(node: any, depth = 0): string {
    const lines: string[] = [];
    const indent = '  '.repeat(depth);
    
    if (node.role) {
      let line = `${indent}[${node.uid}] ${node.role}`;
      
      // Add name (label/text)
      if (node.name) {
        line += `: ${node.name}`;
      }
      
      // Add value (for inputs)
      if (node.value) {
        line += ` = "${node.value}"`;
      }
      
      // Add useful attributes
      const attrs: string[] = [];
      if (node.checked !== undefined) attrs.push(`checked=${node.checked}`);
      if (node.disabled) attrs.push('disabled');
      if (node.focused) attrs.push('focused');
      if (node.pressed !== undefined) attrs.push(`pressed=${node.pressed}`);
      if (node.selected !== undefined) attrs.push(`selected=${node.selected}`);
      if (node.expanded !== undefined) attrs.push(`expanded=${node.expanded}`);
      
      if (attrs.length > 0) {
        line += ` (${attrs.join(', ')})`;
      }
      
      lines.push(line);
    }
    
    // Recursively process children
    if (node.children) {
      for (const child of node.children) {
        lines.push(this.formatA11ySnapshot(child, depth + 1));
      }
    }
    
    return lines.join('\n');
  }

  /**
   * Get element by UID
   * @param page Current page
   * @param uid UID from snapshot
   * @param uidMap UID mapping (from createTextSnapshot result)
   */
  async getElementByUid(
    page: Page,
    uid: string,
    uidMap?: Map<string, any>
  ): Promise<ElementHandle<Element>> {
    // Use provided uidMap or current map
    const map = uidMap || this.currentUidMap;
    
    if (!map || map.size === 0) {
      throw new Error('No snapshot found. Use take_snapshot to capture one.');
    }
    
    // Verify UID belongs to current snapshot
    const [snapshotId] = uid.split('_');
    const currentSnapshotId = String(this.snapshotIdCounter - 1);
    
    if (snapshotId !== currentSnapshotId && !uidMap) {
      throw new Error(
        `UID ${uid} is from an old snapshot (${snapshotId}). ` +
        `Current snapshot is ${currentSnapshotId}. ` +
        `Call take_snapshot to get a fresh snapshot.`
      );
    }
    
    const node = map.get(uid);
    if (!node) {
      throw new Error(`No element found with UID: ${uid}`);
    }
    
    // Get the element handle from the accessibility node
    // Note: Puppeteer's accessibility nodes don't directly expose elementHandle
    // We need to find the element by other means (e.g., role + name)
    
    try {
      // Try to locate element by its attributes
      const selector = this.buildSelectorFromNode(node);
      const element = await page.$(selector);
      
      if (!element) {
        throw new Error(`Element not found in DOM for UID: ${uid}`);
      }
      
      return element;
    } catch (error) {
      throw new Error(`Failed to locate element for UID ${uid}: ${error.message}`);
    }
  }

  /**
   * Build a selector from accessibility node
   * This is a fallback since accessibility nodes don't have direct element handles
   */
  private buildSelectorFromNode(node: any): string {
    // Try to build a selector based on role and attributes
    const parts: string[] = [];
    
    // Use role as element type hint
    if (node.role === 'button') {
      parts.push('button');
    } else if (node.role === 'textbox') {
      parts.push('input[type="text"], input:not([type]), textarea');
    } else if (node.role === 'link') {
      parts.push('a');
    }
    
    // Add name-based selector if available
    if (node.name) {
      // Try aria-label, alt text, or text content
      if (parts.length === 0) {
        return `[aria-label="${node.name}"], [alt="${node.name}"]`;
      }
    }
    
    // Fallback to generic selector
    return parts.join(', ') || '*';
  }

  /**
   * Get current snapshot ID
   */
  getCurrentSnapshotId(): string {
    return String(this.snapshotIdCounter - 1);
  }

  /**
   * Get current UID map
   */
  getCurrentUidMap(): Map<string, any> {
    return this.currentUidMap;
  }
}


