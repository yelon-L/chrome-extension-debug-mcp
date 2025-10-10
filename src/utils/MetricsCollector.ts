/**
 * Metrics Collector
 * 
 * Collects and analyzes metrics about tool usage, context effectiveness,
 * and suggestion adoption to measure the impact of the Response Builder pattern.
 */

import type { 
  ToolMetrics, 
  ToolCall, 
  ToolChainAnalysis, 
  MetricsReport 
} from '../types/tool-response-config.js';

export class MetricsCollector {
  private metrics: Map<string, ToolMetrics> = new Map();
  private sessionHistory: ToolCall[] = [];
  private suggestionsGiven: Map<string, Set<string>> = new Map(); // sourceTool -> Set<suggestedTools>

  /**
   * Record tool usage
   */
  recordToolUsage(toolName: string, startTime: number, success: boolean = true, args?: Record<string, any>): void {
    const metrics = this.getOrCreateMetrics(toolName);
    metrics.usageCount++;
    
    if (success) {
      metrics.successCount++;
    } else {
      metrics.failureCount++;
    }
    
    const duration = Date.now() - startTime;
    metrics.avgResponseTime = 
      (metrics.avgResponseTime * (metrics.usageCount - 1) + duration) / 
      metrics.usageCount;
    
    this.sessionHistory.push({
      toolName,
      timestamp: Date.now(),
      duration,
      args,
      success
    });
  }

  /**
   * Record suggestions given by a tool
   */
  recordSuggestionsGiven(sourceTool: string, suggestedTools: string[]): void {
    if (!this.suggestionsGiven.has(sourceTool)) {
      this.suggestionsGiven.set(sourceTool, new Set());
    }
    const suggestions = this.suggestionsGiven.get(sourceTool)!;
    suggestedTools.forEach(tool => suggestions.add(tool));
  }

  /**
   * Analyze suggestion adoption
   * Checks if suggested tools were used within the next N steps
   */
  analyzeSuggestionAdoption(lookAheadSteps: number = 3): void {
    for (let i = 0; i < this.sessionHistory.length; i++) {
      const current = this.sessionHistory[i];
      const suggestions = this.suggestionsGiven.get(current.toolName);
      
      if (!suggestions || suggestions.size === 0) continue;
      
      // Check next N steps
      const nextSteps = this.sessionHistory.slice(i + 1, i + 1 + lookAheadSteps);
      const adoptedTools = new Set(nextSteps.map(step => step.toolName));
      
      // Calculate adoption rate
      const metrics = this.getOrCreateMetrics(current.toolName);
      let adopted = 0;
      suggestions.forEach(suggestedTool => {
        if (adoptedTools.has(suggestedTool)) {
          adopted++;
        }
      });
      
      if (suggestions.size > 0) {
        const adoptionRate = adopted / suggestions.size;
        metrics.suggestionAdoptionRate = 
          (metrics.suggestionAdoptionRate * (i > 0 ? 1 : 0) + adoptionRate) / 
          ((i > 0 ? 1 : 0) + 1);
      }
    }
  }

  /**
   * Calculate context effectiveness
   * Measures how often context provided by one tool is used by the next
   */
  calculateContextEffectiveness(): number {
    let usefulContextCount = 0;
    let totalContextCount = 0;
    
    for (let i = 0; i < this.sessionHistory.length - 1; i++) {
      const current = this.sessionHistory[i];
      const next = this.sessionHistory[i + 1];
      
      if (this.contextWasUsed(current, next)) {
        usefulContextCount++;
      }
      totalContextCount++;
    }
    
    return totalContextCount > 0 ? usefulContextCount / totalContextCount : 0;
  }

  /**
   * Check if context from current tool was used in next tool
   */
  private contextWasUsed(current: ToolCall, next: ToolCall): boolean {
    if (!current.args || !next.args) return false;
    
    // Check if any value from current.args appears in next.args
    const currentValues = new Set(Object.values(current.args).map(v => String(v)));
    const nextValues = new Set(Object.values(next.args).map(v => String(v)));
    
    for (const value of currentValues) {
      if (nextValues.has(value)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Analyze tool chains
   */
  analyzeToolChain(): ToolChainAnalysis {
    const chains = this.identifyProblemSolvingChains(this.sessionHistory);
    
    if (chains.length === 0) {
      return {
        avgChainLength: 0,
        commonPatterns: [],
        improvementOpportunities: []
      };
    }
    
    const avgChainLength = chains.reduce((sum, chain) => sum + chain.length, 0) / chains.length;
    const commonPatterns = this.extractCommonPatterns(chains);
    const improvementOpportunities = this.findImprovementOpportunities(chains);
    
    return {
      avgChainLength,
      commonPatterns,
      improvementOpportunities
    };
  }

  /**
   * Identify problem-solving chains
   * A chain is a sequence of tools leading to a solution
   */
  private identifyProblemSolvingChains(history: ToolCall[]): string[][] {
    const chains: string[][] = [];
    let currentChain: string[] = [];
    
    for (const call of history) {
      currentChain.push(call.toolName);
      
      // A chain ends when we see a "terminal" tool (quick tools, debug tools)
      if (this.isTerminalTool(call.toolName)) {
        chains.push([...currentChain]);
        currentChain = [];
      }
    }
    
    // Add remaining chain if any
    if (currentChain.length > 0) {
      chains.push(currentChain);
    }
    
    return chains;
  }

  /**
   * Check if a tool is a "terminal" tool (indicates end of chain)
   */
  private isTerminalTool(toolName: string): boolean {
    const terminalTools = [
      'quick_extension_debug',
      'quick_performance_check',
      'audit_extension_security',
      'export_extension_network_har'
    ];
    return terminalTools.includes(toolName);
  }

  /**
   * Extract common patterns from chains
   */
  private extractCommonPatterns(chains: string[][]): string[][] {
    const patternCounts = new Map<string, number>();
    
    // Find patterns of length 2-4
    for (const chain of chains) {
      for (let len = 2; len <= Math.min(4, chain.length); len++) {
        for (let i = 0; i <= chain.length - len; i++) {
          const pattern = chain.slice(i, i + len);
          const key = pattern.join(' -> ');
          patternCounts.set(key, (patternCounts.get(key) || 0) + 1);
        }
      }
    }
    
    // Get patterns that appear at least twice
    const commonPatterns: string[][] = [];
    for (const [pattern, count] of patternCounts.entries()) {
      if (count >= 2) {
        commonPatterns.push(pattern.split(' -> '));
      }
    }
    
    return commonPatterns.slice(0, 10); // Top 10
  }

  /**
   * Find improvement opportunities
   */
  private findImprovementOpportunities(chains: string[][]): string[] {
    const opportunities: string[] = [];
    
    // Find long chains that could be shortened
    const longChains = chains.filter(chain => chain.length > 5);
    if (longChains.length > 0) {
      opportunities.push(
        `${longChains.length} chain(s) are longer than 5 steps - consider creating quick tools`
      );
    }
    
    // Find repeated patterns
    const patterns = this.extractCommonPatterns(chains);
    if (patterns.length > 0) {
      opportunities.push(
        `${patterns.length} common pattern(s) detected - consider automation`
      );
    }
    
    return opportunities;
  }

  /**
   * Calculate average tool chain length
   */
  private calculateAvgChainLength(): number {
    const chains = this.identifyProblemSolvingChains(this.sessionHistory);
    if (chains.length === 0) return 0;
    return chains.reduce((sum, chain) => sum + chain.length, 0) / chains.length;
  }

  /**
   * Get top used tools
   */
  private getTopTools(count: number): Array<{ name: string; count: number }> {
    const sorted = Array.from(this.metrics.values())
      .sort((a, b) => b.usageCount - a.usageCount);
    
    return sorted.slice(0, count).map(m => ({
      name: m.toolName,
      count: m.usageCount
    }));
  }

  /**
   * Calculate suggestion effectiveness
   */
  private calculateSuggestionEffectiveness(): number {
    const metrics = Array.from(this.metrics.values());
    if (metrics.length === 0) return 0;
    
    const totalAdoption = metrics.reduce((sum, m) => sum + m.suggestionAdoptionRate, 0);
    return totalAdoption / metrics.length;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(allMetrics: ToolMetrics[]): string[] {
    const recommendations: string[] = [];
    
    // Check for low success rates
    const lowSuccessTools = allMetrics.filter(m => {
      const successRate = m.usageCount > 0 ? m.successCount / m.usageCount : 1;
      return successRate < 0.8 && m.usageCount >= 3;
    });
    
    if (lowSuccessTools.length > 0) {
      recommendations.push(
        `${lowSuccessTools.length} tool(s) have success rate < 80% - review error handling`
      );
    }
    
    // Check for slow tools
    const slowTools = allMetrics.filter(m => m.avgResponseTime > 5000);
    if (slowTools.length > 0) {
      recommendations.push(
        `${slowTools.length} tool(s) are slow (>5s) - consider optimization`
      );
    }
    
    // Check context effectiveness
    const contextEffectiveness = this.calculateContextEffectiveness();
    if (contextEffectiveness < 0.5) {
      recommendations.push(
        `Context effectiveness is low (${(contextEffectiveness * 100).toFixed(0)}%) - review context rules`
      );
    }
    
    // Check suggestion adoption
    const suggestionEffectiveness = this.calculateSuggestionEffectiveness();
    if (suggestionEffectiveness < 0.4) {
      recommendations.push(
        `Suggestion adoption is low (${(suggestionEffectiveness * 100).toFixed(0)}%) - review suggestion logic`
      );
    }
    
    return recommendations;
  }

  /**
   * Generate metrics report
   */
  generateReport(): MetricsReport {
    // Analyze suggestion adoption before generating report
    this.analyzeSuggestionAdoption();
    
    const allMetrics = Array.from(this.metrics.values());
    
    return {
      summary: {
        totalToolCalls: this.sessionHistory.length,
        avgToolChainLength: this.calculateAvgChainLength(),
        topUsedTools: this.getTopTools(5),
        contextEffectiveness: this.calculateContextEffectiveness(),
        suggestionEffectiveness: this.calculateSuggestionEffectiveness()
      },
      perToolMetrics: allMetrics,
      recommendations: this.generateRecommendations(allMetrics)
    };
  }

  /**
   * Get or create metrics for a tool
   */
  private getOrCreateMetrics(toolName: string): ToolMetrics {
    if (!this.metrics.has(toolName)) {
      this.metrics.set(toolName, {
        toolName,
        usageCount: 0,
        successCount: 0,
        failureCount: 0,
        avgResponseTime: 0,
        contextHitRate: 0,
        suggestionAdoptionRate: 0,
        toolChainLength: []
      });
    }
    return this.metrics.get(toolName)!;
  }

  /**
   * Export metrics for external analysis
   */
  exportMetrics(): ToolMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get session history
   */
  getSessionHistory(): ToolCall[] {
    return [...this.sessionHistory];
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.metrics.clear();
    this.sessionHistory = [];
    this.suggestionsGiven.clear();
  }
}

