# Chrome DevTools Trace Analysis Guide

## Overview

Chrome Extension Debug MCP now integrates with Chrome DevTools frontend to provide professional-grade performance trace analysis and Performance Insights extraction.

## Prerequisites

### Required Package

To enable full DevTools integration, install the chrome-devtools-frontend package:

```bash
npm install chrome-devtools-frontend@1.0.1524741
```

**Note**: The system works with graceful degradation. If this package is not installed, basic trace parsing will still function.

## Available Tools

### 1. analyze_extension_performance

Records a performance trace and analyzes extension impact.

**Usage**:
```json
{
  "tool": "analyze_extension_performance",
  "arguments": {
    "extensionId": "your-extension-id",
    "testUrl": "https://example.com",
    "duration": 3000,
    "iterations": 1
  }
}
```

**Output includes**:
- CPU usage and memory consumption
- Execution time breakdown
- Core Web Vitals (LCP, FID, CLS) impact
- Performance recommendations
- DevTools trace summary (if available)

### 2. performance_list_insights

Lists all available Performance Insights from the last trace recording.

**Usage**:
```json
{
  "tool": "performance_list_insights",
  "arguments": {}
}
```

**Available Insights**:
- `DocumentLatency` - Document loading performance
- `LCPBreakdown` - Largest Contentful Paint analysis
- `CLSCulprits` - Cumulative Layout Shift culprits
- `RenderBlocking` - Render-blocking resources
- `SlowCSSSelector` - Slow CSS selectors
- `INPBreakdown` - Interaction to Next Paint analysis
- `ThirdParties` - Third-party resource impact
- `Viewport` - Viewport configuration issues

### 3. performance_get_insights

Retrieves detailed information about a specific Performance Insight.

**Usage**:
```json
{
  "tool": "performance_get_insights",
  "arguments": {
    "insightName": "LCPBreakdown"
  }
}
```

**Example Output**:
```
LCP Breakdown Analysis:

Largest Contentful Paint: 2.3s (Needs Improvement)

Timeline:
1. Time to First Byte: 450ms
2. Resource Load Delay: 120ms
3. Resource Load Time: 890ms
4. Element Render Delay: 840ms

Recommendations:
- Optimize server response time (TTFB)
- Preload LCP resource
- Optimize image size and format
```

## Workflow Examples

### Example 1: Basic Performance Analysis

```javascript
// Step 1: Attach to Chrome
await attach_to_chrome({ host: "localhost", port: 9222 });

// Step 2: Analyze extension performance
const result = await analyze_extension_performance({
  extensionId: "abc123def456",
  testUrl: "https://example.com",
  duration: 5000
});

// Review results
console.log(result.summary);
console.log(result.recommendations);
```

### Example 2: Deep Dive with Insights

```javascript
// Step 1: Perform analysis to record trace
await analyze_extension_performance({
  extensionId: "abc123def456",
  testUrl: "https://example.com"
});

// Step 2: List available insights
const insights = await performance_list_insights();
console.log("Available insights:", insights);

// Step 3: Get specific insight details
for (const insightName of insights) {
  const details = await performance_get_insights({
    insightName: insightName
  });
  console.log(`\n${insightName}:`);
  console.log(details);
}
```

### Example 3: Automated Performance Testing

```javascript
const testUrls = [
  "https://example.com",
  "https://test.com",
  "https://demo.com"
];

for (const url of testUrls) {
  console.log(`Testing ${url}...`);
  
  const result = await analyze_extension_performance({
    extensionId: "abc123def456",
    testUrl: url,
    duration: 3000
  });
  
  // Check if impact is acceptable
  if (result.impact.level.includes("严重") || result.impact.level.includes("较高")) {
    console.log(`⚠️  High impact detected on ${url}`);
    console.log(result.recommendations);
  } else {
    console.log(`✅ ${url} - Impact acceptable`);
  }
}
```

## Understanding the Output

### Performance Metrics

```json
{
  "metrics": {
    "baseline": {
      "cpuUsage": 15.2,
      "memoryUsage": 45.8,
      "executionTime": 1234
    },
    "withExtension": {
      "cpuUsage": 18.5,
      "memoryUsage": 52.3,
      "executionTime": 1456
    },
    "delta": {
      "cpuUsage": 3.3,
      "memoryUsage": 6.5,
      "executionTime": 222
    }
  }
}
```

- **baseline**: Performance without extension influence
- **withExtension**: Performance with extension active
- **delta**: Difference (extension impact)

### Core Web Vitals Impact

```json
{
  "cwv": {
    "delta": {
      "lcp": 150,  // Largest Contentful Paint impact (ms)
      "fid": 12,   // First Input Delay impact (ms)
      "cls": 0.02  // Cumulative Layout Shift impact
    }
  }
}
```

**Interpretation**:
- **LCP**: < 100ms is good, > 500ms needs attention
- **FID**: < 50ms is good, > 200ms is poor
- **CLS**: < 0.1 is good, > 0.25 is poor

### Impact Levels

- **✅ 极小 (Minimal)**: No significant impact
- **🟢 较低 (Low)**: Minor impact, acceptable
- **🟡 中等 (Medium)**: Noticeable impact, monitor
- **🟠 较高 (High)**: Significant impact, optimize
- **🔴 严重 (Severe)**: Critical impact, urgent action needed

## Performance Recommendations

The analysis provides actionable recommendations based on detected issues:

### CPU Optimization
```
CPU使用率过高 (15.2% → 18.5%)
建议: 优化JavaScript执行逻辑，减少CPU密集型操作
```

### Memory Optimization
```
内存使用较大 (45.8MB → 52.3MB)
建议: 检查内存泄漏，优化数据结构
```

### Core Web Vitals
```
LCP影响较大 (+450ms)
建议: 优化图片资源，使用懒加载
```

## Troubleshooting

### Issue: "No Performance Insights available"

**Cause**: chrome-devtools-frontend package not installed

**Solution**:
```bash
npm install chrome-devtools-frontend@1.0.1524741
npm run build
```

### Issue: "No trace data available"

**Cause**: Need to run performance analysis first

**Solution**:
```javascript
// First, record a trace
await analyze_extension_performance({
  extensionId: "abc123",
  testUrl: "https://example.com"
});

// Then, query insights
await performance_list_insights();
```

### Issue: Trace recording fails

**Causes & Solutions**:

1. **Chrome not running with debugging**
   ```bash
   google-chrome --remote-debugging-port=9222
   ```

2. **Insufficient duration**
   ```javascript
   // Increase duration for complex pages
   duration: 5000  // 5 seconds
   ```

3. **Page load timeout**
   ```javascript
   // Enable network idle waiting
   waitForIdle: true
   ```

## Advanced Usage

### Custom Trace Categories

The trace recording includes these categories:
- `devtools.timeline` - Timeline events
- `disabled-by-default-devtools.timeline` - Detailed timeline
- `disabled-by-default-v8.cpu_profiler` - V8 CPU profiling
- `v8.execute` - V8 execution events
- `blink.user_timing` - User timing marks

### Extension Event Filtering

The system automatically filters trace events related to your extension:

```javascript
// Events matching these patterns are considered extension-related:
- URL contains: chrome-extension://${extensionId}
- Script URL contains extension path
- Frame URL is extension page
```

### Metric Calculation

Performance metrics are calculated from trace events:

- **CPU Time**: Sum of Task and Function call durations
- **Script Time**: Sum of Script execution events
- **Total Duration**: All extension event durations

## Best Practices

### 1. Baseline Recording

Always compare against baseline for accurate impact measurement:

```javascript
// Record without extension first (if possible)
// Then record with extension
// System calculates delta automatically
```

### 2. Multiple Iterations

For more accurate results, use multiple iterations:

```javascript
{
  iterations: 3,  // Average of 3 runs
  duration: 3000
}
```

### 3. Realistic Test URLs

Test on actual user-facing pages:

```javascript
const productionUrls = [
  "https://yoursite.com/home",
  "https://yoursite.com/dashboard",
  "https://yoursite.com/checkout"
];
```

### 4. Regular Monitoring

Set up automated performance tests:

```bash
# Run daily
0 2 * * * node test-performance.js
```

### 5. Insight-Driven Optimization

Use specific insights to guide optimization:

```javascript
// Get LCP breakdown
const lcpDetails = await performance_get_insights({
  insightName: "LCPBreakdown"
});

// Implement recommended fixes
// Re-test to verify improvement
```

## Integration with CI/CD

### Example GitHub Actions Workflow

```yaml
name: Extension Performance Tests

on: [push, pull_request]

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Setup Chrome
        run: |
          google-chrome --remote-debugging-port=9222 &
      
      - name: Run Performance Tests
        run: |
          npm install
          npm run build
          node test/test-trace-integration.js
      
      - name: Check Performance Thresholds
        run: |
          node scripts/check-performance-thresholds.js
```

## References

- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)
- [Performance Insights](https://developer.chrome.com/docs/devtools/performance-insights/)
- [Core Web Vitals](https://web.dev/vitals/)
- [Chrome Extension Performance Best Practices](https://developer.chrome.com/docs/extensions/mv3/performance/)

## Support

For issues or questions:
1. Check [Troubleshooting](#troubleshooting) section
2. Review test examples in `test/test-trace-integration.js`
3. Open an issue on GitHub with trace logs


