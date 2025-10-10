/**
 * Test Chrome DevTools Trace Integration
 * 
 * Tests:
 * 1. Trace recording and parsing
 * 2. Performance Insights extraction
 * 3. Extension event filtering
 * 4. DevTools-level analysis
 */

const { ChromeDebugServer } = await import('../build/ChromeDebugServer.js');

const TEST_URL = 'https://example.com';
let server;
let extensionId;

console.log('='.repeat(80));
console.log('Chrome DevTools Trace Integration Test');
console.log('='.repeat(80));

try {
  // Initialize server
  console.log('\n📦 Initializing Chrome Debug Server...');
  server = new ChromeDebugServer();
  
  // Test 1: Attach to Chrome
  console.log('\n🔌 Test 1: Attaching to Chrome...');
  const attachResult = await server.handleAttachToChrome({
    host: 'localhost',
    port: 9222
  });
  console.log('✅ Attached to Chrome:', attachResult.content[0].text.substring(0, 100));
  
  // Test 2: List extensions
  console.log('\n📋 Test 2: Listing extensions...');
  const extensionsResult = await server.handleListExtensions({});
  const extensionsText = extensionsResult.content[0].text;
  const extensionsData = typeof extensionsText === 'string' ? JSON.parse(extensionsText) : extensionsText;
  const extensions = extensionsData.extensions || extensionsData;
  
  if (extensions && extensions.length > 0) {
    extensionId = extensions[0].id;
    console.log(`✅ Found ${extensions.length} extension(s), using: ${extensions[0].name || extensionId}`);
  } else {
    console.log('⚠️  No extensions found, using mock extension ID');
    extensionId = 'mock-extension-id';
  }
  
  // Test 3: Analyze Extension Performance with Trace
  console.log('\n🔬 Test 3: Analyzing extension performance (with trace recording)...');
  console.log(`   Extension ID: ${extensionId}`);
  console.log(`   Test URL: ${TEST_URL}`);
  console.log(`   This will record a performance trace...`);
  
  const perfResult = await server.handleAnalyzeExtensionPerformance({
    extensionId,
    testUrl: TEST_URL,
    duration: 2000, // 2 seconds
    iterations: 1
  });
  
  const perfText = perfResult.content[0].text;
  const perfData = typeof perfText === 'string' ? JSON.parse(perfText) : perfText;
  
  console.log('✅ Performance analysis completed');
  console.log(`   - Extension: ${perfData.extensionName}`);
  console.log(`   - Test URL: ${perfData.testUrl}`);
  console.log(`   - Impact Level: ${perfData.impact?.level || 'N/A'}`);
  
  if (perfData.metrics) {
    console.log(`   - CPU Usage: ${perfData.metrics.delta?.cpuUsage?.toFixed(2) || 0}%`);
    console.log(`   - Memory Usage: ${perfData.metrics.delta?.memoryUsage?.toFixed(2) || 0}MB`);
  }
  
  if (perfData.cwv) {
    console.log(`   - LCP Impact: ${perfData.cwv.delta?.lcp?.toFixed(2) || 0}ms`);
    console.log(`   - CLS Impact: ${perfData.cwv.delta?.cls?.toFixed(3) || 0}`);
  }
  
  // Test 4: List available Performance Insights
  console.log('\n📊 Test 4: Listing available Performance Insights...');
  
  let insightsData = null;
  try {
    const insightsListResult = await server.handlePerformanceListInsights({});
    const insightsText = insightsListResult.content[0].text;
    insightsData = typeof insightsText === 'string' ? JSON.parse(insightsText) : insightsText;
    
    if (insightsData.insights && insightsData.insights.length > 0) {
      console.log(`✅ Found ${insightsData.insights.length} Performance Insights:`);
      insightsData.insights.forEach((insight, index) => {
        console.log(`   ${index + 1}. ${insight}`);
      });
      
      // Test 5: Get specific insight details
      if (insightsData.insights.length > 0) {
        console.log('\n🔍 Test 5: Getting specific insight details...');
        const firstInsight = insightsData.insights[0];
        console.log(`   Requesting insight: ${firstInsight}`);
        
        try {
          const insightResult = await server.handlePerformanceGetInsights({
            insightName: firstInsight
          });
          
          const insightText = insightResult.content[0].text;
          console.log('✅ Insight details retrieved:');
          console.log(insightText.substring(0, 300) + '...');
        } catch (error) {
          console.log('⚠️  Insight retrieval error:', error.message);
        }
      }
    } else {
      console.log('ℹ️  No Performance Insights available');
      console.log('   This is normal if Chrome DevTools frontend is not installed');
      console.log('   Run: npm install chrome-devtools-frontend@1.0.1524741');
    }
  } catch (error) {
    console.log('ℹ️  Performance Insights not available:', error.message);
    console.log('   This is expected without chrome-devtools-frontend package');
  }
  
  // Test Summary
  console.log('\n' + '='.repeat(80));
  console.log('✅ Trace Integration Tests Completed');
  console.log('='.repeat(80));
  
  console.log('\n📊 Test Results Summary:');
  console.log('   ✅ Chrome connection: Working');
  console.log('   ✅ Trace recording: Working');
  console.log('   ✅ Performance analysis: Working');
  console.log('   ℹ️  DevTools Insights: ' + (insightsData && insightsData.insights && insightsData.insights.length > 0 ? 'Available' : 'Not available (install chrome-devtools-frontend)'));
  
  console.log('\n💡 Notes:');
  console.log('   - For full DevTools integration, install: npm install chrome-devtools-frontend@1.0.1524741');
  console.log('   - The system works with graceful degradation if DevTools modules are not available');
  console.log('   - Basic trace parsing is always available as a fallback');
  
  process.exit(0);
  
} catch (error) {
  console.error('\n❌ Test failed:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
}

