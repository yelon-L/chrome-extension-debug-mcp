/**
 * Quick Debug Tools Definitions
 * 
 * Provides one-click extension debugging and performance checking
 */

export const quickDebugTools = [
  {
    name: 'quick_extension_debug',
    description: 'Quick Extension Debug (Combo Tool)\n\n' +
      'Automatically executes:\n' +
      '1. List extension information\n' +
      '2. Get extension logs (latest 50)\n' +
      '3. Check content script status\n' +
      '4. Check extension storage\n\n' +
      'Purpose: Quickly understand extension current state, suitable for rapid issue diagnosis\n\n' +
      'Tip: This tool automatically calls multiple tools, saving manual operation time',
    inputSchema: {
      type: 'object',
      properties: {
        extensionId: { 
          type: 'string', 
          description: 'Extension ID (required)' 
        },
        includeStorage: { 
          type: 'boolean', 
          description: 'Whether to include storage check (default true)' 
        },
        includeLogs: { 
          type: 'boolean', 
          description: 'Whether to include logs (default true)' 
        },
        includeContentScript: { 
          type: 'boolean', 
          description: 'Whether to include content script check (default true)' 
        }
      },
      required: ['extensionId']
    }
  },
  {
    name: 'quick_performance_check',
    description: 'Quick Performance Check (Combo Tool)\n\n' +
      'Automatically executes:\n' +
      '1. Analyze extension performance impact (2s)\n' +
      '2. Monitor network requests (10s)\n' +
      '3. Generate performance summary report\n\n' +
      'Purpose: Quickly assess extension performance, includes Core Web Vitals\n\n' +
      'Tip: Complete test takes ~12s, use analyze_extension_performance for detailed analysis',
    inputSchema: {
      type: 'object',
      properties: {
        extensionId: { 
          type: 'string',
          description: 'Extension ID (required)'
        },
        testUrl: { 
          type: 'string', 
          description: 'Test page URL (default https://example.com)' 
        }
      },
      required: ['extensionId']
    }
  }
];


