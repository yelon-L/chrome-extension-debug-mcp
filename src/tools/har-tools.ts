/**
 * HAR导出工具定义
 * 
 * 提供标准HAR格式的网络数据导出
 */

export const harTools = [
  {
    name: 'export_extension_network_har',
    description: '导出扩展网络活动为HAR格式（HTTP Archive）\n\n' +
      '功能：\n' +
      '- 导出标准HAR 1.2格式\n' +
      '- 包含所有扩展发起的网络请求\n' +
      '- 可导入Chrome DevTools、WebPageTest等工具分析\n\n' +
      '用途：深度分析扩展网络行为，与第三方工具集成\n\n' +
      '提示：HAR文件可用于性能分析、调试和分享',
    inputSchema: {
      type: 'object',
      properties: {
        extensionId: { 
          type: 'string', 
          description: '要监控的扩展ID' 
        },
        duration: { 
          type: 'number', 
          description: '监控持续时间（毫秒），默认30000（30秒）' 
        },
        outputPath: { 
          type: 'string', 
          description: 'HAR文件保存路径（可选，如不指定则只返回数据）' 
        },
        includeContent: { 
          type: 'boolean', 
          description: '是否包含响应内容（默认false，仅元数据）' 
        },
        testUrl: {
          type: 'string',
          description: '测试页面URL（可选，监控期间访问的页面）'
        }
      },
      required: ['extensionId']
    }
  }
];


