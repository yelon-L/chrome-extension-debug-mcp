/**
 * DeveloperToolsHandler - 开发者工具处理器
 * Phase 3: Developer Experience Optimization
 */

import type { Page } from 'puppeteer-core';
import type { ChromeManager } from '../managers/ChromeManager.js';
import type { PageManager } from '../managers/PageManager.js';
import type {
  PermissionCheckResult,
  PermissionInfo,
  SecurityAuditResult,
  SecurityIssue,
  UpdateCheckResult,
  UpdateInfo
} from '../types/developer-types.js';

export class DeveloperToolsHandler {
  private chromeManager: ChromeManager;
  private pageManager: PageManager;

  // 权限风险等级映射
  private readonly PERMISSION_RISKS: Record<string, { risk: 'low' | 'medium' | 'high'; description: string }> = {
    'activeTab': { risk: 'low', description: '访问当前活动标签页' },
    'tabs': { risk: 'medium', description: '访问所有标签页信息' },
    'storage': { risk: 'low', description: '使用本地存储' },
    'alarms': { risk: 'low', description: '创建定时任务' },
    'notifications': { risk: 'low', description: '显示通知' },
    'webRequest': { risk: 'high', description: '拦截和修改网络请求' },
    'webRequestBlocking': { risk: 'high', description: '阻塞网络请求' },
    'cookies': { risk: 'medium', description: '访问Cookie' },
    'history': { risk: 'medium', description: '访问浏览历史' },
    'bookmarks': { risk: 'medium', description: '访问书签' },
    'geolocation': { risk: 'high', description: '访问地理位置' },
    'management': { risk: 'medium', description: '管理其他扩展' },
    'scripting': { risk: 'medium', description: '注入脚本到页面' },
    'debugger': { risk: 'high', description: '使用调试器API' },
    'proxy': { risk: 'high', description: '控制代理设置' },
    'privacy': { risk: 'high', description: '修改隐私设置' },
    'system.display': { risk: 'low', description: '访问显示器信息' },
    'system.storage': { risk: 'low', description: '访问存储信息' },
    'downloads': { risk: 'medium', description: '管理下载' },
    'clipboardWrite': { risk: 'medium', description: '写入剪贴板' },
    'clipboardRead': { risk: 'high', description: '读取剪贴板' }
  };

  constructor(chromeManager: ChromeManager, pageManager: PageManager) {
    this.chromeManager = chromeManager;
    this.pageManager = pageManager;
  }

  /**
   * 检查扩展权限
   */
  async checkExtensionPermissions(args: { extensionId: string }): Promise<PermissionCheckResult> {
    console.log('[DeveloperToolsHandler] 检查扩展权限:', args.extensionId);

    try {
      // 获取扩展manifest
      const manifest = await this.getExtensionManifest(args.extensionId);
      
      if (!manifest) {
        throw new Error('无法获取扩展manifest');
      }

      const permissions = manifest.permissions || [];
      const hostPermissions = manifest.host_permissions || [];
      const permissionInfos: PermissionInfo[] = [];
      
      // 分析每个权限
      for (const perm of permissions) {
        const permInfo = this.PERMISSION_RISKS[perm] || { 
          risk: 'medium' as const, 
          description: '未知权限' 
        };

        permissionInfos.push({
          name: perm,
          required: true, // 默认认为是必需的
          used: true,     // 实际使用情况需要代码分析
          risk: permInfo.risk,
          description: permInfo.description,
          recommendation: this.getPermissionRecommendation(perm, permInfo.risk)
        });
      }

      // 统计
      const usedCount = permissionInfos.filter(p => p.used).length;
      const unusedCount = permissionInfos.filter(p => !p.used).length;

      // 计算权限健康度评分
      const score = this.calculatePermissionScore(permissionInfos, hostPermissions);

      // 生成建议
      const recommendations = this.generatePermissionRecommendations(
        permissionInfos, 
        hostPermissions, 
        score
      );

      return {
        extensionId: args.extensionId,
        totalPermissions: permissions.length,
        usedPermissions: usedCount,
        unusedPermissions: unusedCount,
        permissions: permissionInfos,
        hostPermissions,
        recommendations,
        score
      };

    } catch (error) {
      console.error('[DeveloperToolsHandler] 权限检查失败:', error);
      throw error;
    }
  }

  /**
   * 安全审计
   */
  async auditExtensionSecurity(args: { extensionId: string }): Promise<SecurityAuditResult> {
    console.log('[DeveloperToolsHandler] 安全审计:', args.extensionId);

    try {
      const manifest = await this.getExtensionManifest(args.extensionId);
      
      if (!manifest) {
        throw new Error('无法获取扩展manifest');
      }

      const issues: SecurityIssue[] = [];

      // 1. Manifest安全检查
      const manifestIssues = this.checkManifestSecurity(manifest);
      issues.push(...manifestIssues);

      // 2. 权限安全检查
      const permissionIssues = await this.checkPermissionSecurity(args.extensionId, manifest);
      issues.push(...permissionIssues);

      // 3. CSP检查
      const cspIssues = this.checkContentSecurityPolicy(manifest);
      issues.push(...cspIssues);

      // 4. 网络安全检查
      const networkIssues = this.checkNetworkSecurity(manifest);
      issues.push(...networkIssues);

      // 统计问题数量
      const summary = {
        critical: issues.filter(i => i.type === 'critical').length,
        high: issues.filter(i => i.type === 'high').length,
        medium: issues.filter(i => i.type === 'medium').length,
        low: issues.filter(i => i.type === 'low').length,
        info: issues.filter(i => i.type === 'info').length
      };

      // 计算各项评分
      const manifestSecurity = 100 - (manifestIssues.length * 10);
      const permissionSecurity = 100 - (permissionIssues.length * 15);
      const codeSecurity = 100 - (cspIssues.length * 20);
      const networkSecurity = 100 - (networkIssues.length * 15);

      // 计算总分
      const overallScore = Math.max(0, Math.round(
        (manifestSecurity + permissionSecurity + codeSecurity + networkSecurity) / 4
      ));

      // 确定安全等级
      const securityLevel = 
        overallScore >= 90 ? 'excellent' :
        overallScore >= 75 ? 'good' :
        overallScore >= 60 ? 'fair' :
        overallScore >= 40 ? 'poor' : 'critical';

      // 生成建议
      const recommendations = this.generateSecurityRecommendations(issues, overallScore);

      return {
        extensionId: args.extensionId,
        extensionName: manifest.name || 'Unknown',
        version: manifest.version || '0.0.0',
        auditDate: new Date().toISOString(),
        overallScore,
        securityLevel,
        issues,
        summary,
        recommendations,
        details: {
          manifestSecurity: Math.max(0, manifestSecurity),
          permissionSecurity: Math.max(0, permissionSecurity),
          codeSecurity: Math.max(0, codeSecurity),
          networkSecurity: Math.max(0, networkSecurity)
        }
      };

    } catch (error) {
      console.error('[DeveloperToolsHandler] 安全审计失败:', error);
      throw error;
    }
  }

  /**
   * 检查扩展更新
   */
  async checkExtensionUpdates(args: { extensionId: string }): Promise<UpdateCheckResult> {
    console.log('[DeveloperToolsHandler] 检查更新:', args.extensionId);

    try {
      const manifest = await this.getExtensionManifest(args.extensionId);
      
      if (!manifest) {
        throw new Error('无法获取扩展manifest');
      }

      const currentVersion = manifest.version || '0.0.0';
      
      // 检查更新源
      const updateUrl = manifest.update_url;
      const updateSource = updateUrl?.includes('chrome.google.com') ? 'chrome_web_store' : 
                          updateUrl ? 'manual' : 'unknown';

      // 模拟更新检查（实际需要调用Chrome Web Store API）
      const updateInfo: UpdateInfo = {
        extensionId: args.extensionId,
        currentVersion,
        hasUpdate: false,
        updateAvailable: false,
        updateSource,
        updateUrl,
        lastChecked: new Date().toISOString()
      };

      // 生成建议
      const recommendations: string[] = [];
      
      if (!updateUrl) {
        recommendations.push('建议在manifest中添加update_url以支持自动更新');
      }

      if (updateSource === 'unknown') {
        recommendations.push('建议发布到Chrome Web Store以便用户获取更新');
      }

      recommendations.push('定期检查扩展更新以获取安全修复和新功能');
      recommendations.push('在更新前务必测试新版本的兼容性');

      return {
        extensionId: args.extensionId,
        currentVersion,
        updateInfo,
        recommendations,
        autoUpdateEnabled: !!updateUrl,
        updatePolicy: updateUrl ? 'auto' : 'manual'
      };

    } catch (error) {
      console.error('[DeveloperToolsHandler] 更新检查失败:', error);
      throw error;
    }
  }

  /**
   * 获取扩展manifest
   */
  private async getExtensionManifest(extensionId: string): Promise<any> {
    try {
      // 直接使用ExtensionDetector获取扩展信息
      const { ExtensionDetector } = await import('./extension/ExtensionDetector.js');
      const detector = new ExtensionDetector(this.chromeManager);
      const extensions = await detector.listExtensions({});
      
      const extension = extensions.find(ext => ext.id === extensionId);
      if (!extension) {
        console.error(`[DeveloperToolsHandler] Extension ${extensionId} not found`);
        return null;
      }

      // 从扩展信息中提取manifest相关数据
      return {
        name: extension.name,
        version: extension.version || '1.0.0',
        description: extension.description || '',
        manifest_version: extension.manifestVersion || 3,
        permissions: extension.permissions || [],
        host_permissions: extension.hostPermissions || []
      };
    } catch (error) {
      console.error('[DeveloperToolsHandler] 获取manifest失败:', error);
      return null;
    }
  }

  /**
   * 计算权限健康度评分
   */
  private calculatePermissionScore(permissions: PermissionInfo[], hostPermissions: string[]): number {
    let score = 100;

    // 高风险权限扣分
    const highRiskCount = permissions.filter(p => p.risk === 'high').length;
    score -= highRiskCount * 15;

    // 中风险权限扣分
    const mediumRiskCount = permissions.filter(p => p.risk === 'medium').length;
    score -= mediumRiskCount * 5;

    // <all_urls>扣分
    if (hostPermissions.includes('<all_urls>')) {
      score -= 20;
    }

    // 权限过多扣分
    if (permissions.length > 10) {
      score -= (permissions.length - 10) * 2;
    }

    return Math.max(0, score);
  }

  /**
   * 获取权限建议
   */
  private getPermissionRecommendation(permission: string, risk: string): string | undefined {
    if (risk === 'high') {
      return `高风险权限，请确保真正需要${permission}权限`;
    }
    if (risk === 'medium') {
      return `请仔细审查${permission}权限的使用场景`;
    }
    return undefined;
  }

  /**
   * 生成权限建议
   */
  private generatePermissionRecommendations(
    permissions: PermissionInfo[], 
    hostPermissions: string[], 
    score: number
  ): string[] {
    const recommendations: string[] = [];

    if (score < 60) {
      recommendations.push('权限配置存在安全风险，建议进行优化');
    }

    const highRiskPerms = permissions.filter(p => p.risk === 'high');
    if (highRiskPerms.length > 0) {
      recommendations.push(`发现${highRiskPerms.length}个高风险权限，请确认是否必需`);
    }

    if (hostPermissions.includes('<all_urls>')) {
      recommendations.push('使用<all_urls>会访问所有网站，建议限制为特定域名');
    }

    if (permissions.length > 15) {
      recommendations.push('权限数量过多，建议移除不必要的权限');
    }

    if (recommendations.length === 0) {
      recommendations.push('权限配置良好，继续保持最小权限原则');
    }

    return recommendations;
  }

  /**
   * 检查Manifest安全性
   */
  private checkManifestSecurity(manifest: any): SecurityIssue[] {
    const issues: SecurityIssue[] = [];

    // 检查manifest版本
    if (manifest.manifest_version < 3) {
      issues.push({
        type: 'medium',
        category: 'manifest',
        title: 'Manifest Version过时',
        description: 'Manifest V2将被弃用',
        impact: '可能无法在未来的Chrome版本中运行',
        recommendation: '升级到Manifest V3'
      });
    }

    // 检查externally_connectable
    if (manifest.externally_connectable && manifest.externally_connectable.matches) {
      const matches = manifest.externally_connectable.matches;
      if (matches.includes('*://*/*') || matches.includes('<all_urls>')) {
        issues.push({
          type: 'high',
          category: 'manifest',
          title: '外部连接配置过于宽松',
          description: 'externally_connectable允许任意网站连接',
          impact: '可能被恶意网站利用',
          recommendation: '限制为特定的可信域名'
        });
      }
    }

    return issues;
  }

  /**
   * 检查权限安全性
   */
  private async checkPermissionSecurity(extensionId: string, manifest: any): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];
    const permissions = manifest.permissions || [];

    // 检查危险权限组合
    if (permissions.includes('webRequest') && permissions.includes('webRequestBlocking')) {
      issues.push({
        type: 'high',
        category: 'permissions',
        title: '危险权限组合',
        description: 'webRequest + webRequestBlocking可以拦截和修改所有请求',
        impact: '可能被用于窃取用户数据',
        recommendation: '确保请求拦截逻辑安全可靠'
      });
    }

    // 检查debugger权限
    if (permissions.includes('debugger')) {
      issues.push({
        type: 'critical',
        category: 'permissions',
        title: '使用debugger权限',
        description: 'debugger权限可以访问和修改页面的所有内容',
        impact: '极高安全风险',
        recommendation: '仅在绝对必要时使用，并确保代码安全'
      });
    }

    return issues;
  }

  /**
   * 检查Content Security Policy
   */
  private checkContentSecurityPolicy(manifest: any): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    const csp = manifest.content_security_policy;

    if (!csp) {
      issues.push({
        type: 'medium',
        category: 'csp',
        title: '未配置CSP',
        description: '缺少Content Security Policy配置',
        impact: '可能存在XSS漏洞',
        recommendation: '添加严格的CSP配置'
      });
    } else {
      // 检查unsafe-eval
      const cspString = typeof csp === 'string' ? csp : csp.extension_pages || '';
      if (cspString.includes('unsafe-eval')) {
        issues.push({
          type: 'high',
          category: 'csp',
          title: 'CSP包含unsafe-eval',
          description: '允许使用eval()和类似函数',
          impact: '增加代码注入风险',
          recommendation: '移除unsafe-eval，使用安全的替代方案',
          cwe: 'CWE-95'
        });
      }
    }

    return issues;
  }

  /**
   * 检查网络安全
   */
  private checkNetworkSecurity(manifest: any): SecurityIssue[] {
    const issues: SecurityIssue[] = [];
    const hostPermissions = manifest.host_permissions || [];

    // 检查HTTP权限
    const httpPermissions = hostPermissions.filter((h: string) => h.startsWith('http://'));
    if (httpPermissions.length > 0) {
      issues.push({
        type: 'medium',
        category: 'network',
        title: '使用HTTP协议',
        description: `${httpPermissions.length}个host_permissions使用HTTP`,
        impact: '数据传输不加密',
        recommendation: '使用HTTPS协议',
        affectedFiles: httpPermissions
      });
    }

    return issues;
  }

  /**
   * 生成安全建议
   */
  private generateSecurityRecommendations(issues: SecurityIssue[], score: number): string[] {
    const recommendations: string[] = [];

    // 根据评分给出总体建议
    if (score >= 90) {
      recommendations.push('安全性优秀，继续保持良好的安全实践');
    } else if (score >= 75) {
      recommendations.push('安全性良好，建议修复发现的问题');
    } else if (score >= 60) {
      recommendations.push('安全性一般，需要关注并修复安全问题');
    } else if (score >= 40) {
      recommendations.push('安全性较差，请尽快修复高危问题');
    } else {
      recommendations.push('安全性严重不足，存在重大安全隐患，请立即处理');
    }

    // 统计问题类型
    const criticalCount = issues.filter(i => i.type === 'critical').length;
    const highCount = issues.filter(i => i.type === 'high').length;

    if (criticalCount > 0) {
      recommendations.push(`发现${criticalCount}个严重安全问题，请优先处理`);
    }

    if (highCount > 0) {
      recommendations.push(`发现${highCount}个高危安全问题，建议及时修复`);
    }

    // 具体建议
    recommendations.push('定期进行安全审计');
    recommendations.push('遵循最小权限原则');
    recommendations.push('使用HTTPS进行数据传输');
    recommendations.push('启用严格的Content Security Policy');
    recommendations.push('及时更新依赖库以修复已知漏洞');

    return recommendations;
  }
}

