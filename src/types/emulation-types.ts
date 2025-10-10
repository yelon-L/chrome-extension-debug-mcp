/**
 * Emulation Types - Device and Network Emulation
 */

/**
 * Network condition presets
 */
export type NetworkPreset = 
  | 'Fast 3G'
  | 'Slow 3G'
  | '4G'
  | 'Offline'
  | 'No throttling';

/**
 * Network emulation conditions
 */
export interface NetworkCondition {
  /**
   * Download throughput in bytes/second (-1 for unlimited)
   */
  downloadThroughput: number;
  
  /**
   * Upload throughput in bytes/second (-1 for unlimited)
   */
  uploadThroughput: number;
  
  /**
   * Latency in milliseconds
   */
  latency: number;
  
  /**
   * Optional: Packet loss rate (0-1)
   */
  packetLoss?: number;
}

/**
 * Predefined network conditions
 */
export const NETWORK_PRESETS: Record<NetworkPreset, NetworkCondition> = {
  'Fast 3G': {
    downloadThroughput: 1.6 * 1024 * 1024 / 8, // 1.6 Mbps
    uploadThroughput: 750 * 1024 / 8,          // 750 Kbps
    latency: 150
  },
  'Slow 3G': {
    downloadThroughput: 400 * 1024 / 8,        // 400 Kbps
    uploadThroughput: 400 * 1024 / 8,          // 400 Kbps
    latency: 2000
  },
  '4G': {
    downloadThroughput: 4 * 1024 * 1024 / 8,   // 4 Mbps
    uploadThroughput: 3 * 1024 * 1024 / 8,     // 3 Mbps
    latency: 20
  },
  'Offline': {
    downloadThroughput: 0,
    uploadThroughput: 0,
    latency: 0
  },
  'No throttling': {
    downloadThroughput: -1,
    uploadThroughput: -1,
    latency: 0
  }
};

/**
 * CPU throttling rate
 */
export interface CPUThrottling {
  /**
   * CPU slowdown multiplier (1 = no throttling, 4 = 4x slower)
   */
  rate: number;
}

/**
 * Combined emulation condition for testing
 */
export interface EmulationCondition {
  /**
   * Name of this condition
   */
  name: string;
  
  /**
   * Network condition (preset name or custom)
   */
  network?: NetworkPreset | NetworkCondition;
  
  /**
   * CPU throttling rate
   */
  cpu?: number;
  
  /**
   * Description
   */
  description?: string;
}

/**
 * Emulation result
 */
export interface EmulationResult {
  /**
   * Condition that was tested
   */
  condition: EmulationCondition;
  
  /**
   * Extension ID
   */
  extensionId: string;
  
  /**
   * Test URL
   */
  testUrl: string;
  
  /**
   * Whether extension functioned correctly
   */
  functional: boolean;
  
  /**
   * Performance metrics under this condition
   */
  metrics?: {
    loadTime: number;
    cpuUsage?: number;
    memoryUsage?: number;
    networkRequests?: number;
  };
  
  /**
   * Errors encountered
   */
  errors?: string[];
  
  /**
   * Warnings
   */
  warnings?: string[];
  
  /**
   * Test timestamp
   */
  timestamp: number;
}

/**
 * Batch test result
 */
export interface BatchEmulationResult {
  /**
   * Extension ID
   */
  extensionId: string;
  
  /**
   * Test URL
   */
  testUrl: string;
  
  /**
   * All test results
   */
  results: EmulationResult[];
  
  /**
   * Summary
   */
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    functionalityRate: number; // 0-100%
  };
  
  /**
   * Recommendations based on results
   */
  recommendations: string[];
  
  /**
   * Overall timestamp
   */
  timestamp: number;
}

/**
 * Predefined test conditions
 */
export const TEST_CONDITIONS: EmulationCondition[] = [
  {
    name: 'Optimal',
    network: 'No throttling',
    cpu: 1,
    description: 'Ideal conditions - no throttling'
  },
  {
    name: 'Good 4G',
    network: '4G',
    cpu: 1,
    description: 'Good mobile network'
  },
  {
    name: 'Fast 3G',
    network: 'Fast 3G',
    cpu: 1,
    description: 'Average mobile network'
  },
  {
    name: 'Slow 3G',
    network: 'Slow 3G',
    cpu: 2,
    description: 'Poor network with some CPU throttling'
  },
  {
    name: 'Slow Device + Poor Network',
    network: 'Slow 3G',
    cpu: 4,
    description: 'Low-end device with poor network'
  },
  {
    name: 'Offline',
    network: 'Offline',
    cpu: 1,
    description: 'No network connection'
  },
  {
    name: 'CPU Intensive',
    network: 'No throttling',
    cpu: 6,
    description: 'Test CPU-bound operations'
  }
];

