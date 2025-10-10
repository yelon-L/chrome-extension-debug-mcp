/**
 * Developer Tools Types
 * Phase 3: Developer Experience Optimization
 */

/**
 * 权限信息
 */
export interface PermissionInfo {
  name: string;                    // 权限名称
  required: boolean;               // 是否必需
  used: boolean;                   // 是否被使用
  risk: 'low' | 'medium' | 'high'; // 风险等级
  description: string;             // 权限描述
  recommendation?: string;         // 建议
}

/**
 * 权限检查结果
 */
export interface PermissionCheckResult {
  extensionId: string;
  totalPermissions: number;
  usedPermissions: number;
  unusedPermissions: number;
  permissions: PermissionInfo[];
  hostPermissions: string[];
  recommendations: string[];
  score: number;                   // 权限健康度评分(0-100)
}

/**
 * 安全问题
 */
export interface SecurityIssue {
  type: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: 'csp' | 'permissions' | 'code' | 'dependencies' | 'manifest' | 'network';
  title: string;
  description: string;
  impact: string;
  recommendation: string;
  cwe?: string;                    // CWE编号
  affectedFiles?: string[];
}

/**
 * 安全审计结果
 */
export interface SecurityAuditResult {
  extensionId: string;
  extensionName: string;
  version: string;
  auditDate: string;
  overallScore: number;            // 总体评分(0-100)
  securityLevel: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  issues: SecurityIssue[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  recommendations: string[];
  details: {
    manifestSecurity: number;      // Manifest安全性(0-100)
    permissionSecurity: number;    // 权限安全性(0-100)
    codeSecurity: number;          // 代码安全性(0-100)
    networkSecurity: number;       // 网络安全性(0-100)
  };
}

/**
 * 更新信息
 */
export interface UpdateInfo {
  extensionId: string;
  currentVersion: string;
  latestVersion?: string;
  hasUpdate: boolean;
  updateAvailable: boolean;
  updateSource: 'chrome_web_store' | 'manual' | 'unknown';
  updateUrl?: string;
  releaseNotes?: string;
  changes?: string[];
  lastChecked: string;
}

/**
 * 更新检查结果
 */
export interface UpdateCheckResult {
  extensionId: string;
  currentVersion: string;
  updateInfo: UpdateInfo;
  recommendations: string[];
  autoUpdateEnabled: boolean;
  updatePolicy?: string;
}

/**
 * 开发者建议
 */
export interface DeveloperRecommendation {
  category: 'security' | 'performance' | 'best-practice' | 'compatibility';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action: string;
  resources?: string[];
}

