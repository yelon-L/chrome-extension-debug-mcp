# Phase 7: 智能诊断引擎 - 启动计划

## 🎯 目标
从"建议下一步"进化到"自动诊断并给出解决方案"

---

## 📋 Week 1 任务清单

### Day 1-2: 设计与架构

#### ✅ 任务1.1: 定义核心接口
```typescript
// src/diagnosis/types.ts

export interface ProblemSymptom {
  type: string;              // 症状类型
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  evidence: any;             // 证据数据
}

export interface ProblemPattern {
  id: string;
  name: string;
  category: 'injection' | 'permission' | 'performance' | 'compatibility' | 'security';
  
  // 症状匹配规则
  symptoms: {
    required: string[];      // 必须匹配的症状
    optional: string[];      // 可选症状（提高置信度）
    exclusions: string[];    // 排除症状
  };
  
  // 诊断信息
  rootCause: string;
  diagnosticSteps: DiagnosticStep[];
  
  // 解决方案
  solutions: Solution[];
  
  // 元数据
  confidence: number;        // 基础置信度
  frequency: number;         // 问题频率（从指标获取）
  mvVersion?: 2 | 3;        // MV版本特定
}

export interface DiagnosticStep {
  tool: string;              // 使用的工具
  args?: any;                // 工具参数
  validation: (result: any) => boolean;  // 结果验证
}

export interface Solution {
  type: 'manifest_update' | 'code_change' | 'permission_grant' | 'config_change';
  description: string;
  autoFixable: boolean;
  steps: SolutionStep[];
  estimatedTime: string;
  risk: 'low' | 'medium' | 'high';
}

export interface DiagnosisReport {
  extensionId: string;
  timestamp: number;
  
  // 诊断结果
  identifiedPatterns: MatchedPattern[];
  rootCauses: string[];
  
  // 建议方案
  recommendedSolutions: Solution[];
  
  // 元数据
  confidence: number;
  diagnosticDuration: number;
}

export interface MatchedPattern extends ProblemPattern {
  matchedSymptoms: ProblemSymptom[];
  matchScore: number;        // 匹配分数
  confidence: number;        // 实际置信度
}
```

#### ✅ 任务1.2: 创建问题模式库基础结构
```typescript
// src/diagnosis/patterns/index.ts

export const PROBLEM_PATTERNS: ProblemPattern[] = [
  // 注入失败类
  {
    id: 'cs_injection_mv3_permissions',
    name: 'Content Script Injection Failure (MV3 Permissions)',
    category: 'injection',
    symptoms: {
      required: [
        'content_script_status.injectionFailed',
        'manifest.version_3',
      ],
      optional: [
        'console.error.host_permissions',
        'permissions.missing'
      ],
      exclusions: []
    },
    rootCause: 'Manifest V3 requires explicit host_permissions for content script injection',
    diagnosticSteps: [
      { tool: 'check_extension_permissions', validation: (r) => r.missing.length > 0 },
      { tool: 'get_console_logs', args: { level: ['error'] }, validation: (r) => r.some(log => log.includes('host')) }
    ],
    solutions: [
      {
        type: 'manifest_update',
        description: 'Add host_permissions to manifest.json',
        autoFixable: true,
        steps: [
          { action: 'Add "host_permissions": ["<all_urls>"] to manifest.json' },
          { action: 'Reload extension' }
        ],
        estimatedTime: '2 minutes',
        risk: 'low'
      }
    ],
    confidence: 0.95,
    frequency: 0.8,
    mvVersion: 3
  },
  
  // 待添加更多模式...
];
```

#### ✅ 任务1.3: 设计症状收集器
```typescript
// src/diagnosis/SymptomCollector.ts

export class SymptomCollector {
  private extensionHandler: ExtensionHandler;
  private pageManager: PageManager;
  
  async collectSymptoms(extensionId: string): Promise<ProblemSymptom[]> {
    const symptoms: ProblemSymptom[] = [];
    
    // 1. 检查注入状态
    const csStatus = await this.checkContentScriptStatus(extensionId);
    if (csStatus.injectionFailed) {
      symptoms.push({
        type: 'content_script_status.injectionFailed',
        severity: 'high',
        description: 'Content script injection failed',
        evidence: csStatus
      });
    }
    
    // 2. 检查控制台错误
    const logs = await this.checkConsoleLogs();
    const errors = logs.filter(l => l.level === 'error');
    if (errors.length > 0) {
      symptoms.push({
        type: 'console.errors',
        severity: 'high',
        description: `${errors.length} console error(s)`,
        evidence: errors
      });
    }
    
    // 3. 检查权限
    const permissions = await this.checkPermissions(extensionId);
    if (permissions.missing.length > 0) {
      symptoms.push({
        type: 'permissions.missing',
        severity: 'critical',
        description: `Missing permissions: ${permissions.missing.join(', ')}`,
        evidence: permissions
      });
    }
    
    // 4. 检查性能
    const perf = await this.checkPerformance(extensionId);
    if (perf.cpuUsage > 80) {
      symptoms.push({
        type: 'performance.high_cpu',
        severity: 'medium',
        description: 'High CPU usage',
        evidence: perf
      });
    }
    
    // 5. 检查网络
    const network = await this.checkNetwork(extensionId);
    if (network.failedRequests > 0) {
      symptoms.push({
        type: 'network.failed_requests',
        severity: 'high',
        description: `${network.failedRequests} failed request(s)`,
        evidence: network
      });
    }
    
    return symptoms;
  }
}
```

---

### Day 3-4: 核心实现

#### ✅ 任务2.1: 实现诊断引擎
```typescript
// src/diagnosis/DiagnosticEngine.ts

export class DiagnosticEngine {
  private symptomCollector: SymptomCollector;
  private patternMatcher: PatternMatcher;
  private solutionGenerator: SolutionGenerator;
  
  async diagnose(extensionId: string): Promise<DiagnosisReport> {
    const startTime = Date.now();
    
    // Step 1: 收集症状
    console.log(`[Diagnostic] Collecting symptoms for ${extensionId}...`);
    const symptoms = await this.symptomCollector.collectSymptoms(extensionId);
    console.log(`[Diagnostic] Found ${symptoms.length} symptom(s)`);
    
    // Step 2: 匹配问题模式
    console.log(`[Diagnostic] Matching patterns...`);
    const matchedPatterns = await this.patternMatcher.match(symptoms);
    console.log(`[Diagnostic] Matched ${matchedPatterns.length} pattern(s)`);
    
    // Step 3: 执行诊断步骤验证
    console.log(`[Diagnostic] Validating patterns...`);
    const validatedPatterns = await this.validatePatterns(matchedPatterns, extensionId);
    console.log(`[Diagnostic] Validated ${validatedPatterns.length} pattern(s)`);
    
    // Step 4: 生成解决方案
    console.log(`[Diagnostic] Generating solutions...`);
    const solutions = await this.solutionGenerator.generate(validatedPatterns);
    
    // Step 5: 计算总体置信度
    const confidence = this.calculateConfidence(validatedPatterns);
    
    const report: DiagnosisReport = {
      extensionId,
      timestamp: Date.now(),
      identifiedPatterns: validatedPatterns,
      rootCauses: validatedPatterns.map(p => p.rootCause),
      recommendedSolutions: solutions,
      confidence,
      diagnosticDuration: Date.now() - startTime
    };
    
    console.log(`[Diagnostic] Diagnosis complete in ${report.diagnosticDuration}ms`);
    return report;
  }
  
  private async validatePatterns(
    patterns: MatchedPattern[],
    extensionId: string
  ): Promise<MatchedPattern[]> {
    const validated: MatchedPattern[] = [];
    
    for (const pattern of patterns) {
      let allStepsPassed = true;
      
      for (const step of pattern.diagnosticSteps) {
        // 执行诊断步骤
        const result = await this.executeStep(step, extensionId);
        
        // 验证结果
        if (!step.validation(result)) {
          allStepsPassed = false;
          break;
        }
      }
      
      if (allStepsPassed) {
        validated.push(pattern);
      }
    }
    
    return validated;
  }
}
```

#### ✅ 任务2.2: 实现模式匹配器
```typescript
// src/diagnosis/PatternMatcher.ts

export class PatternMatcher {
  private patterns: ProblemPattern[];
  
  async match(symptoms: ProblemSymptom[]): Promise<MatchedPattern[]> {
    const matches: MatchedPattern[] = [];
    
    for (const pattern of this.patterns) {
      const score = this.calculateMatchScore(pattern, symptoms);
      
      if (score.isMatch) {
        matches.push({
          ...pattern,
          matchedSymptoms: score.matchedSymptoms,
          matchScore: score.score,
          confidence: this.adjustConfidence(pattern.confidence, score)
        });
      }
    }
    
    // 按置信度排序
    return matches.sort((a, b) => b.confidence - a.confidence);
  }
  
  private calculateMatchScore(
    pattern: ProblemPattern,
    symptoms: ProblemSymptom[]
  ): MatchScore {
    const symptomTypes = symptoms.map(s => s.type);
    
    // 检查必需症状
    const requiredMatched = pattern.symptoms.required.every(
      req => symptomTypes.includes(req)
    );
    
    if (!requiredMatched) {
      return { isMatch: false, score: 0, matchedSymptoms: [] };
    }
    
    // 检查排除症状
    const hasExclusions = pattern.symptoms.exclusions.some(
      exc => symptomTypes.includes(exc)
    );
    
    if (hasExclusions) {
      return { isMatch: false, score: 0, matchedSymptoms: [] };
    }
    
    // 计算分数
    let score = 0.6; // 基础分（必需症状全匹配）
    
    // 可选症状加分
    const optionalMatched = pattern.symptoms.optional.filter(
      opt => symptomTypes.includes(opt)
    );
    score += (optionalMatched.length / pattern.symptoms.optional.length) * 0.4;
    
    const matchedSymptoms = symptoms.filter(s =>
      [...pattern.symptoms.required, ...optionalMatched].includes(s.type)
    );
    
    return {
      isMatch: true,
      score,
      matchedSymptoms
    };
  }
}
```

---

### Day 5: 测试与集成

#### ✅ 任务3.1: 编写测试
```javascript
// test/test-diagnostic-engine.js

import { DiagnosticEngine } from '../build/diagnosis/DiagnosticEngine.js';

async function testDiagnosticEngine() {
  console.log('🧪 诊断引擎测试\n');
  
  // Test 1: Content Script Injection Failure
  const test1 = async () => {
    const engine = new DiagnosticEngine();
    const report = await engine.diagnose('test-extension-id');
    
    assert(report.identifiedPatterns.length > 0, '应识别出问题模式');
    assert(report.confidence > 0.8, '置信度应该较高');
    assert(report.recommendedSolutions.length > 0, '应提供解决方案');
  };
  
  // 更多测试...
}
```

#### ✅ 任务3.2: 集成到MCP工具
```typescript
// 在 ChromeDebugServer.ts 中添加新工具

{
  name: 'diagnose_extension',
  description: 'Automatically diagnose extension issues and provide solutions',
  inputSchema: {
    type: 'object',
    properties: {
      extensionId: { type: 'string', description: 'Extension ID to diagnose' },
      autoFix: { type: 'boolean', description: 'Attempt automatic fixes', default: false }
    },
    required: ['extensionId']
  }
}

async handleDiagnoseExtension(args: any) {
  const { extensionId, autoFix } = args;
  
  const engine = new DiagnosticEngine(/* ... */);
  const report = await engine.diagnose(extensionId);
  
  // 使用Response Builder格式化
  return await this.buildToolResponse(
    'diagnose_extension',
    report,
    'analysis',
    { extensionId }
  );
}
```

---

## 📋 Week 2 任务清单

### Day 6-7: 扩展问题模式库

#### ✅ 任务4: 添加30+问题模式

**分类覆盖**:
1. **注入问题** (10个模式)
   - MV3权限问题
   - 动态注入失败
   - CSP冲突
   - Frame隔离问题

2. **权限问题** (8个模式)
   - 缺失必需权限
   - 过度权限警告
   - 运行时权限请求失败
   - Host权限配置错误

3. **性能问题** (8个模式)
   - 高CPU占用
   - 内存泄漏
   - 慢速网络请求
   - 渲染阻塞

4. **兼容性问题** (6个模式)
   - MV2→MV3迁移问题
   - API废弃警告
   - 跨浏览器兼容性
   - 版本不兼容

5. **安全问题** (8个模式)
   - 不安全的eval使用
   - XSS风险
   - CORS问题
   - 敏感数据泄露

### Day 8-9: 增强诊断能力

#### ✅ 任务5: 多模式组合诊断
```typescript
class AdvancedDiagnosticEngine extends DiagnosticEngine {
  // 处理多个问题同时存在的情况
  async diagnoseComplex(extensionId: string): Promise<ComplexDiagnosisReport> {
    // 识别问题链（一个问题导致另一个问题）
    const problemChains = await this.identifyProblemChains();
    
    // 识别根本原因（多个症状的共同根源）
    const rootCause = await this.identifyRootCause();
    
    return {
      primaryIssue: rootCause,
      relatedIssues: problemChains,
      resolutionOrder: this.calculateResolutionOrder()
    };
  }
}
```

#### ✅ 任务6: 置信度优化
- 基于历史数据调整模式权重
- 误报检测与修正
- A/B测试不同匹配策略

### Day 10: 文档与发布

#### ✅ 任务7: 编写文档
- 诊断引擎使用指南
- 问题模式贡献指南
- API文档
- 实战案例库

#### ✅ 任务8: 集成测试
- 20个真实扩展测试
- 准确率验证
- 性能测试

---

## 🎯 成功标准

### 功能完整性
- ✅ 50+ 问题模式
- ✅ 5大类问题覆盖
- ✅ 自动诊断工具集成
- ✅ Response Builder格式化

### 性能指标
- ✅ 诊断准确率 ≥85%
- ✅ 自动修复率 ≥60%
- ✅ 误报率 <10%
- ✅ 诊断耗时 <5秒

### 测试覆盖
- ✅ 单元测试 100%
- ✅ 集成测试 20+案例
- ✅ 真实场景验证

---

## 🚀 立即开始

### Step 1: 创建分支
```bash
git checkout -b phase-7-diagnostic-engine
```

### Step 2: 创建目录结构
```bash
mkdir -p src/diagnosis/{patterns,types}
mkdir -p test/diagnosis
```

### Step 3: 开始编码
```bash
# 创建核心文件
touch src/diagnosis/types.ts
touch src/diagnosis/DiagnosticEngine.ts
touch src/diagnosis/SymptomCollector.ts
touch src/diagnosis/PatternMatcher.ts
touch src/diagnosis/SolutionGenerator.ts
touch src/diagnosis/patterns/index.ts

# 编译测试
npm run build
```

### Step 4: 测试驱动开发
```bash
# 创建测试
touch test/diagnosis/test-diagnostic-engine.js
touch test/diagnosis/test-pattern-matcher.js

# 运行测试
node test/diagnosis/test-diagnostic-engine.js
```

---

## 📞 需要帮助？

随时询问：
- 架构设计问题
- 实现细节
- 测试策略
- 问题模式建议

**让我们开始打造智能诊断引擎吧！** 🚀

