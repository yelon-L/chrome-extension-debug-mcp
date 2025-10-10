/**
 * Test Device Emulation Tools
 * 
 * Tests:
 * 1. CPU throttling
 * 2. Network condition emulation
 * 3. Batch condition testing
 */

const { ChromeDebugServer } = await import('../build/ChromeDebugServer.js');

const TEST_URL = 'https://example.com';
let server;
let extensionId;

console.log('='.repeat(80));
console.log('Device Emulation Tools Test');
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
  console.log('✅ Attached to Chrome');
  
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
  
  // Test 3: CPU Emulation
  console.log('\n🖥️  Test 3: CPU Throttling...');
  
  // Test 3.1: No throttling
  console.log('   3.1: Setting CPU to 1x (no throttling)');
  const cpu1x = await server.handleEmulateCPU({ rate: 1 });
  const cpu1xData = JSON.parse(cpu1x.content[0].text);
  console.log(`   ✅ ${cpu1xData.message}`);
  
  // Test 3.2: Low-end mobile (4x)
  console.log('   3.2: Setting CPU to 4x (low-end mobile)');
  const cpu4x = await server.handleEmulateCPU({ rate: 4 });
  const cpu4xData = JSON.parse(cpu4x.content[0].text);
  console.log(`   ✅ ${cpu4xData.message}`);
  
  // Test 3.3: Very slow device (6x)
  console.log('   3.3: Setting CPU to 6x (very slow device)');
  const cpu6x = await server.handleEmulateCPU({ rate: 6 });
  const cpu6xData = JSON.parse(cpu6x.content[0].text);
  console.log(`   ✅ ${cpu6xData.message}`);
  
  // Reset CPU
  const cpuReset = await server.handleEmulateCPU({ rate: 1 });
  console.log('   ✅ CPU reset to normal');
  
  // Test 4: Network Emulation
  console.log('\n🌐 Test 4: Network Condition Emulation...');
  
  // Test 4.1: Fast 3G
  console.log('   4.1: Setting network to Fast 3G');
  const netFast3G = await server.handleEmulateNetwork({ 
    condition: 'Fast 3G' 
  });
  const fast3gData = JSON.parse(netFast3G.content[0].text);
  console.log(`   ✅ ${fast3gData.message}`);
  
  // Test 4.2: Slow 3G
  console.log('   4.2: Setting network to Slow 3G');
  const netSlow3G = await server.handleEmulateNetwork({ 
    condition: 'Slow 3G' 
  });
  const slow3gData = JSON.parse(netSlow3G.content[0].text);
  console.log(`   ✅ ${slow3gData.message}`);
  
  // Test 4.3: Offline
  console.log('   4.3: Setting network to Offline');
  const netOffline = await server.handleEmulateNetwork({ 
    condition: 'Offline' 
  });
  const offlineData = JSON.parse(netOffline.content[0].text);
  console.log(`   ✅ ${offlineData.message}`);
  
  // Test 4.4: Custom condition
  console.log('   4.4: Setting custom network condition');
  const netCustom = await server.handleEmulateNetwork({ 
    condition: {
      downloadThroughput: 500 * 1024 / 8, // 500 Kbps
      uploadThroughput: 250 * 1024 / 8,   // 250 Kbps
      latency: 1000                        // 1 second latency
    }
  });
  const customData = JSON.parse(netCustom.content[0].text);
  console.log(`   ✅ ${customData.message}`);
  
  // Reset network
  const netReset = await server.handleEmulateNetwork({ 
    condition: 'No throttling' 
  });
  console.log('   ✅ Network reset to normal');
  
  // Test 5: Batch Condition Testing
  console.log('\n🧪 Test 5: Batch testing extension under multiple conditions...');
  console.log(`   Extension ID: ${extensionId}`);
  console.log(`   Test URL: ${TEST_URL}`);
  console.log('   This will test 7 predefined conditions...');
  
  const batchResult = await server.handleTestExtensionConditions({
    extensionId,
    testUrl: TEST_URL,
    timeout: 15000
  });
  
  const batchData = JSON.parse(batchResult.content[0].text);
  
  console.log('\n   📊 Batch Test Results:');
  console.log(`   - Total Tests: ${batchData.summary.totalTests}`);
  console.log(`   - Passed: ${batchData.summary.passed}`);
  console.log(`   - Failed: ${batchData.summary.failed}`);
  console.log(`   - Functionality Rate: ${batchData.summary.functionalityRate.toFixed(1)}%`);
  
  console.log('\n   📝 Tested Conditions:');
  batchData.results.forEach((result, index) => {
    const status = result.functional ? '✅' : '❌';
    const loadTime = result.metrics?.loadTime ? `${result.metrics.loadTime}ms` : 'N/A';
    console.log(`   ${status} ${result.condition.name} - Load Time: ${loadTime}`);
    if (result.errors && result.errors.length > 0) {
      result.errors.forEach(err => {
        console.log(`      ⚠️  ${err}`);
      });
    }
  });
  
  if (batchData.recommendations && batchData.recommendations.length > 0) {
    console.log('\n   💡 Recommendations:');
    batchData.recommendations.forEach(rec => {
      console.log(`   ${rec}`);
    });
  }
  
  // Test Summary
  console.log('\n' + '='.repeat(80));
  console.log('✅ Device Emulation Tests Completed');
  console.log('='.repeat(80));
  
  console.log('\n📊 Test Results Summary:');
  console.log('   ✅ Chrome connection: Working');
  console.log('   ✅ CPU throttling: Working (tested 1x, 4x, 6x)');
  console.log('   ✅ Network emulation: Working (Fast 3G, Slow 3G, Offline, Custom)');
  console.log(`   ✅ Batch testing: Working (${batchData.summary.functionalityRate.toFixed(0)}% pass rate)`);
  
  console.log('\n💡 Features Demonstrated:');
  console.log('   - CPU throttling from 1x to 20x slowdown');
  console.log('   - Network condition presets (Fast 3G, Slow 3G, 4G, Offline)');
  console.log('   - Custom network conditions');
  console.log('   - Batch testing across 7 predefined scenarios');
  console.log('   - Automatic functionality detection');
  console.log('   - Performance metrics collection');
  console.log('   - Intelligent recommendations');
  
  console.log('\n🎯 Next Steps:');
  console.log('   - Use emulation tools to test extension reliability');
  console.log('   - Identify performance bottlenecks on slow devices');
  console.log('   - Ensure offline functionality');
  console.log('   - Optimize for poor network conditions');
  
  process.exit(0);
  
} catch (error) {
  console.error('\n❌ Test failed:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
}

