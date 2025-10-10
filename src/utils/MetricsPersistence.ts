/**
 * Metrics Persistence
 * 
 * Handles saving, loading, and exporting metrics data
 * for long-term analysis and trend tracking.
 */

import { promises as fs } from 'fs';
import path from 'path';
import type { ToolMetrics } from '../types/tool-response-config.js';

export interface MetricsData {
  timestamp: string;
  version: string;
  metrics: ToolMetrics[];
  sessionDuration?: number;
  totalToolCalls?: number;
}

export class MetricsPersistence {
  private storePath: string;

  constructor(storePath?: string) {
    this.storePath = storePath || path.join(process.cwd(), '.mcp-metrics.json');
  }

  /**
   * Save metrics to file
   */
  async saveMetrics(metrics: ToolMetrics[], metadata?: Partial<MetricsData>): Promise<void> {
    const data: MetricsData = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      metrics,
      ...metadata
    };
    
    try {
      await fs.writeFile(
        this.storePath,
        JSON.stringify(data, null, 2),
        'utf-8'
      );
      console.log(`[MetricsPersistence] Metrics saved to ${this.storePath}`);
    } catch (error) {
      console.error('[MetricsPersistence] Failed to save metrics:', error);
      throw error;
    }
  }

  /**
   * Load metrics from file
   */
  async loadMetrics(): Promise<ToolMetrics[]> {
    try {
      const data = await fs.readFile(this.storePath, 'utf-8');
      const parsed: MetricsData = JSON.parse(data);
      console.log(`[MetricsPersistence] Loaded metrics from ${parsed.timestamp}`);
      return parsed.metrics || [];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.log('[MetricsPersistence] No existing metrics file found');
        return [];
      }
      console.error('[MetricsPersistence] Failed to load metrics:', error);
      return [];
    }
  }

  /**
   * Load full metrics data (including metadata)
   */
  async loadMetricsData(): Promise<MetricsData | null> {
    try {
      const data = await fs.readFile(this.storePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  /**
   * Append metrics to existing file (for incremental tracking)
   */
  async appendMetrics(newMetrics: ToolMetrics[]): Promise<void> {
    const existing = await this.loadMetrics();
    
    // Merge metrics
    const mergedMap = new Map<string, ToolMetrics>();
    
    // Add existing metrics
    for (const metric of existing) {
      mergedMap.set(metric.toolName, metric);
    }
    
    // Merge new metrics
    for (const newMetric of newMetrics) {
      const existing = mergedMap.get(newMetric.toolName);
      if (existing) {
        // Merge counts and recalculate averages
        const totalUsage = existing.usageCount + newMetric.usageCount;
        mergedMap.set(newMetric.toolName, {
          toolName: newMetric.toolName,
          usageCount: totalUsage,
          successCount: existing.successCount + newMetric.successCount,
          failureCount: existing.failureCount + newMetric.failureCount,
          avgResponseTime: 
            (existing.avgResponseTime * existing.usageCount + 
             newMetric.avgResponseTime * newMetric.usageCount) / totalUsage,
          contextHitRate:
            (existing.contextHitRate * existing.usageCount + 
             newMetric.contextHitRate * newMetric.usageCount) / totalUsage,
          suggestionAdoptionRate:
            (existing.suggestionAdoptionRate * existing.usageCount + 
             newMetric.suggestionAdoptionRate * newMetric.usageCount) / totalUsage,
          toolChainLength: [
            ...existing.toolChainLength,
            ...newMetric.toolChainLength
          ]
        });
      } else {
        mergedMap.set(newMetric.toolName, newMetric);
      }
    }
    
    await this.saveMetrics(Array.from(mergedMap.values()));
  }

  /**
   * Export metrics to CSV format
   */
  async exportToCSV(outputPath: string, metrics?: ToolMetrics[]): Promise<void> {
    const metricsToExport = metrics || await this.loadMetrics();
    
    if (metricsToExport.length === 0) {
      console.log('[MetricsPersistence] No metrics to export');
      return;
    }
    
    const headers = [
      'Tool Name',
      'Usage Count',
      'Success Count',
      'Failure Count',
      'Success Rate (%)',
      'Avg Response Time (ms)',
      'Context Hit Rate (%)',
      'Suggestion Adoption Rate (%)'
    ];
    
    const rows = metricsToExport.map(m => {
      const successRate = m.usageCount > 0 ? (m.successCount / m.usageCount * 100) : 0;
      return [
        m.toolName,
        m.usageCount.toString(),
        m.successCount.toString(),
        m.failureCount.toString(),
        successRate.toFixed(1),
        m.avgResponseTime.toFixed(0),
        (m.contextHitRate * 100).toFixed(1),
        (m.suggestionAdoptionRate * 100).toFixed(1)
      ];
    });
    
    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    try {
      await fs.writeFile(outputPath, csv, 'utf-8');
      console.log(`[MetricsPersistence] Metrics exported to ${outputPath}`);
    } catch (error) {
      console.error('[MetricsPersistence] Failed to export CSV:', error);
      throw error;
    }
  }

  /**
   * Export detailed metrics to JSON format
   */
  async exportToJSON(outputPath: string, includeHistory: boolean = false): Promise<void> {
    const data = await this.loadMetricsData();
    
    if (!data) {
      console.log('[MetricsPersistence] No metrics to export');
      return;
    }
    
    const exportData = includeHistory ? data : { ...data };
    
    try {
      await fs.writeFile(
        outputPath,
        JSON.stringify(exportData, null, 2),
        'utf-8'
      );
      console.log(`[MetricsPersistence] Metrics exported to ${outputPath}`);
    } catch (error) {
      console.error('[MetricsPersistence] Failed to export JSON:', error);
      throw error;
    }
  }

  /**
   * Clear all saved metrics
   */
  async clearMetrics(): Promise<void> {
    try {
      await fs.unlink(this.storePath);
      console.log('[MetricsPersistence] Metrics cleared');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        console.error('[MetricsPersistence] Failed to clear metrics:', error);
        throw error;
      }
    }
  }

  /**
   * Get metrics summary
   */
  async getMetricsSummary(): Promise<{
    totalTools: number;
    totalCalls: number;
    avgSuccessRate: number;
    lastUpdated: string;
  } | null> {
    const data = await this.loadMetricsData();
    
    if (!data || data.metrics.length === 0) {
      return null;
    }
    
    const totalCalls = data.metrics.reduce((sum, m) => sum + m.usageCount, 0);
    const totalSuccess = data.metrics.reduce((sum, m) => sum + m.successCount, 0);
    const avgSuccessRate = totalCalls > 0 ? (totalSuccess / totalCalls * 100) : 0;
    
    return {
      totalTools: data.metrics.length,
      totalCalls,
      avgSuccessRate,
      lastUpdated: data.timestamp
    };
  }
}

