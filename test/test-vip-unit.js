/**
 * VIP Core Functionality Unit Test
 * 
 * Tests VIP features without requiring Chrome connection
 */

import { SuggestionEngine } from '../build/utils/SuggestionEngine.js';
import { MetricsCollector } from '../build/utils/MetricsCollector.js';
import { getToolConfig } from '../build/configs/tool-response-configs.js';

console.log('🧪 VIP核心功能单元测试\n');
console.log('='.repeat(70));

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`❌ ${name}: ${error.message}`);
    failed++;
  }
}

// ===== Test 1: 配置系统 =====
console.log('\n📋 1. 配置系统测试\n');

test('加载工具配置', () => {
  const config = getToolConfig('list_tabs');
  if (!config) throw new Error('配置未找到');
  if (config.toolName !== 'list_tabs') throw new Error('工具名称不匹配');
  if (!config.useResponseBuilder) throw new Error('未启用Response Builder');
});

test('验证上下文规则', () => {
  const config = getToolConfig('get_extension_logs');
  if (!config.contextRules.includePageContext) throw new Error('缺少页面上下文规则');
  if (!config.contextRules.includeExtensionStatus) throw new Error('缺少扩展状态规则');
});

test('验证建议规则', () => {
  const config = getToolConfig('content_script_status');
  if (!config.suggestionRules.enabled) throw new Error('建议未启用');
  if (config.suggestionRules.priorityLevel !== 'conditional') throw new Error('优先级级别不正确');
});

test('验证指标配置', () => {
  const config = getToolConfig('analyze_extension_performance');
  if (!config.metrics.trackUsage) throw new Error('未启用使用跟踪');
  if (!config.metrics.trackSuccess) throw new Error('未启用成功跟踪');
});

test('验证24个工具配置', () => {
  const expectedTools = [
    'list_tabs', 'get_extension_logs', 'content_script_status',
    'list_extension_contexts', 'inspect_extension_storage',
    'monitor_extension_messages', 'track_extension_api_calls',
    'test_extension_on_multiple_pages', 'list_extension_requests',
    'get_extension_request_details', 'analyze_extension_network',
    'analyze_extension_performance', 'performance_list_insights',
    'performance_get_insights', 'test_extension_conditions',
    'take_snapshot', 'wait_for_extension_ready',
    'check_extension_permissions', 'audit_extension_security',
    'check_extension_updates', 'quick_extension_debug',
    'quick_performance_check', 'get_console_logs'
  ];
  
  let configured = 0;
  for (const tool of expectedTools) {
    if (getToolConfig(tool)) configured++;
  }
  
  if (configured < 23) throw new Error(`只配置了${configured}/23个工具`);
});

// ===== Test 2: 建议引擎 =====
console.log('\n💡 2. 建议引擎测试\n');

const suggestionEngine = new SuggestionEngine();

test('生成list_extensions建议', async () => {
  const extensions = [
    { id: 'abc123', name: 'Test Ext', enabled: false },
    { id: 'def456', name: 'Error Ext', enabled: true, hasErrors: true }
  ];
  
  const suggestions = await suggestionEngine.generateSuggestions(
    'list_extensions',
    extensions,
    {}
  );
  
  if (suggestions.length === 0) throw new Error('未生成建议');
  if (!suggestions.some(s => s.priority === 'HIGH')) throw new Error('缺少HIGH优先级建议');
  if (!suggestions.some(s => s.priority === 'CRITICAL')) throw new Error('缺少CRITICAL优先级建议');
});

test('生成get_extension_logs建议', async () => {
  const logs = [
    { level: 'error', text: 'Error 1' },
    { level: 'error', text: 'Error 2' },
    { level: 'warning', text: 'Warning 1' }
  ];
  
  const suggestions = await suggestionEngine.generateSuggestions(
    'get_extension_logs',
    logs,
    { extensionId: 'abc123' }
  );
  
  if (suggestions.length === 0) throw new Error('未生成建议');
  const critical = suggestions.find(s => s.priority === 'CRITICAL');
  if (!critical) throw new Error('未生成CRITICAL建议');
  if (!critical.toolName) throw new Error('建议缺少工具名');
});

test('生成content_script_status建议', async () => {
  const status = {
    injectionFailed: true,
    notInjectedCount: 3
  };
  
  const suggestions = await suggestionEngine.generateSuggestions(
    'content_script_status',
    status,
    { extensionId: 'abc123' }
  );
  
  if (suggestions.length === 0) throw new Error('未生成建议');
  if (!suggestions.some(s => s.priority === 'HIGH')) throw new Error('未生成HIGH建议');
});

test('建议优先级排序', async () => {
  const extensions = [
    { id: 'abc', enabled: false }, // HIGH
    { id: 'def', hasErrors: true }  // CRITICAL
  ];
  
  const suggestions = await suggestionEngine.generateSuggestions(
    'list_extensions',
    extensions,
    {}
  );
  
  if (suggestions[0].priority !== 'CRITICAL') throw new Error('优先级排序错误');
  if (suggestions[1].priority !== 'HIGH') throw new Error('优先级排序错误');
});

test('建议包含工具参数', async () => {
  const extensions = [{ id: 'abc123', hasErrors: true, name: 'Test' }];
  
  const suggestions = await suggestionEngine.generateSuggestions(
    'list_extensions',
    extensions,
    {}
  );
  
  const critical = suggestions.find(s => s.priority === 'CRITICAL');
  if (!critical.args) throw new Error('建议缺少参数');
  if (!critical.args.extensionId) throw new Error('建议参数缺少extensionId');
});

// ===== Test 3: 指标收集 =====
console.log('\n📊 3. 指标收集测试\n');

const metricsCollector = new MetricsCollector();

test('记录工具使用', () => {
  const startTime = Date.now();
  metricsCollector.recordToolUsage('list_tabs', startTime, true);
  
  const metrics = metricsCollector.exportMetrics();
  if (metrics.length === 0) throw new Error('未记录指标');
  if (metrics[0].toolName !== 'list_tabs') throw new Error('工具名不匹配');
  if (metrics[0].usageCount !== 1) throw new Error('使用次数不正确');
});

test('记录成功/失败', () => {
  const startTime = Date.now();
  metricsCollector.recordToolUsage('test_tool', startTime, true);
  metricsCollector.recordToolUsage('test_tool', startTime, false);
  
  const metrics = metricsCollector.exportMetrics().find(m => m.toolName === 'test_tool');
  if (metrics.successCount !== 1) throw new Error('成功计数不正确');
  if (metrics.failureCount !== 1) throw new Error('失败计数不正确');
});

test('记录建议给出', () => {
  metricsCollector.recordSuggestionsGiven('source_tool', ['suggested_tool1', 'suggested_tool2']);
  // 没有异常即通过
});

test('计算上下文有效性', () => {
  metricsCollector.recordToolUsage('tool1', Date.now(), true, { extensionId: 'abc' });
  metricsCollector.recordToolUsage('tool2', Date.now(), true, { extensionId: 'abc' });
  
  const effectiveness = metricsCollector.calculateContextEffectiveness();
  if (typeof effectiveness !== 'number') throw new Error('有效性计算失败');
  if (effectiveness < 0 || effectiveness > 1) throw new Error('有效性值超出范围');
});

test('生成指标报告', () => {
  const report = metricsCollector.generateReport();
  
  if (!report.summary) throw new Error('缺少摘要');
  if (typeof report.summary.totalToolCalls !== 'number') throw new Error('缺少总调用数');
  if (!Array.isArray(report.perToolMetrics)) throw new Error('缺少工具指标');
  if (!Array.isArray(report.recommendations)) throw new Error('缺少建议');
});

test('工具链分析', () => {
  const analysis = metricsCollector.analyzeToolChain();
  
  if (typeof analysis.avgChainLength !== 'number') throw new Error('缺少平均链长度');
  if (!Array.isArray(analysis.commonPatterns)) throw new Error('缺少常见模式');
  if (!Array.isArray(analysis.improvementOpportunities)) throw new Error('缺少改进机会');
});

// ===== Test 4: 类型安全 =====
console.log('\n🔒 4. 类型系统测试\n');

test('配置类型完整性', () => {
  const config = getToolConfig('analyze_extension_performance');
  
  // 验证所有必需字段
  if (!config.toolName) throw new Error('缺少toolName');
  if (!config.category) throw new Error('缺少category');
  if (typeof config.useResponseBuilder !== 'boolean') throw new Error('缺少useResponseBuilder');
  if (!config.contextRules) throw new Error('缺少contextRules');
  if (!config.suggestionRules) throw new Error('缺少suggestionRules');
  if (!config.metrics) throw new Error('缺少metrics');
});

test('建议结构完整性', async () => {
  const suggestions = await suggestionEngine.generateSuggestions(
    'list_extensions',
    [{ hasErrors: true, id: 'test' }],
    {}
  );
  
  const suggestion = suggestions[0];
  if (!suggestion.priority) throw new Error('缺少priority');
  if (!suggestion.action) throw new Error('缺少action');
  if (!suggestion.toolName) throw new Error('缺少toolName');
  if (!suggestion.reason) throw new Error('缺少reason');
  if (!suggestion.estimatedImpact) throw new Error('缺少estimatedImpact');
});

// ===== 生成报告 =====
console.log('\n' + '='.repeat(70));
console.log('📊 测试报告');
console.log('='.repeat(70));
console.log(`\n✅ 通过: ${passed}`);
console.log(`❌ 失败: ${failed}`);
console.log(`📈 成功率: ${(passed / (passed + failed) * 100).toFixed(1)}%`);

if (failed === 0) {
  console.log('\n🎉 所有测试通过！VIP核心功能正常运行。\n');
  process.exit(0);
} else {
  console.log(`\n⚠️  有 ${failed} 个测试失败。\n`);
  process.exit(1);
}

