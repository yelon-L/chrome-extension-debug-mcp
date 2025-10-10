/**
 * 快捷调试工具定义
 * 
 * 提供一键式扩展调试和性能检测
 */

export const quickDebugTools = [
  {
    name: 'quick_extension_debug',
    description: '一键扩展快速调试（组合工具）\n\n' +
      '自动执行：\n' +
      '1. 列出扩展信息\n' +
      '2. 获取扩展日志（最新50条）\n' +
      '3. 检查内容脚本状态\n' +
      '4. 检查扩展存储\n\n' +
      '用途：快速了解扩展当前状态，适合快速诊断问题\n\n' +
      '提示：这个工具会自动调用多个工具，节省手动操作时间',
    inputSchema: {
      type: 'object',
      properties: {
        extensionId: { 
          type: 'string', 
          description: '扩展ID（必需）' 
        },
        includeStorage: { 
          type: 'boolean', 
          description: '是否包含存储检查（默认true）' 
        },
        includeLogs: { 
          type: 'boolean', 
          description: '是否包含日志（默认true）' 
        },
        includeContentScript: { 
          type: 'boolean', 
          description: '是否包含内容脚本检查（默认true）' 
        }
      },
      required: ['extensionId']
    }
  },
  {
    name: 'quick_performance_check',
    description: '一键性能快速检测（组合工具）\n\n' +
      '自动执行：\n' +
      '1. 分析扩展性能影响（2秒）\n' +
      '2. 监控网络请求（10秒）\n' +
      '3. 生成性能摘要报告\n\n' +
      '用途：快速评估扩展性能表现，包含Core Web Vitals\n\n' +
      '提示：完整测试约12秒，如需更详细分析请使用analyze_extension_performance',
    inputSchema: {
      type: 'object',
      properties: {
        extensionId: { 
          type: 'string',
          description: '扩展ID（必需）'
        },
        testUrl: { 
          type: 'string', 
          description: '测试页面URL（默认https://example.com）' 
        }
      },
      required: ['extensionId']
    }
  }
];


