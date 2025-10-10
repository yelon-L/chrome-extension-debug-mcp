/**
 * HAR Export Tools Definitions
 * 
 * Provides standard HAR format network data export
 */

export const harTools = [
  {
    name: 'export_extension_network_har',
    description: 'Export Extension Network Activity as HAR Format (HTTP Archive)\n\n' +
      'Features:\n' +
      '- Export standard HAR 1.2 format\n' +
      '- Include all extension-initiated network requests\n' +
      '- Import into Chrome DevTools, WebPageTest and other tools for analysis\n\n' +
      'Purpose: Deep analysis of extension network behavior, integrate with third-party tools\n\n' +
      'Tip: HAR files can be used for performance analysis, debugging and sharing',
    inputSchema: {
      type: 'object',
      properties: {
        extensionId: { 
          type: 'string', 
          description: 'Extension ID to monitor' 
        },
        duration: { 
          type: 'number', 
          description: 'Monitoring duration in milliseconds (default 30000 / 30s)' 
        },
        outputPath: { 
          type: 'string', 
          description: 'HAR file save path (optional, returns data only if not specified)' 
        },
        includeContent: { 
          type: 'boolean', 
          description: 'Whether to include response content (default false, metadata only)' 
        },
        testUrl: {
          type: 'string',
          description: 'Test page URL (optional, page to visit during monitoring)'
        }
      },
      required: ['extensionId']
    }
  }
];


