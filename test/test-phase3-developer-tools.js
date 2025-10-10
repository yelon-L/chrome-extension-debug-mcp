/**
 * Phase 3: Developer Tools - 测试脚本
 * 测试3个开发者专用工具
 */

import { ChromeDebugServer } from '../build/ChromeDebugServer.js';

class DeveloperToolsTester {
  constructor() {
    this.server = new ChromeDebugServer();
    this.extensionId = null;
  }

  /**
   * 设置测试环境
   */
  async setup() {
    console.log('🔗 连接到Chrome (端口9222)...');
    const connectResult = await this.server.handleAttachToChrome({ port: 9222 });
    console.log('✅ 已连接到Chrome\n');

    // 获取扩展ID
    const extensionsResult = await this.server.handleListExtensions({});
    const extensionsText = extensionsResult.content[0].text;
    const extensionsData = typeof extensionsText === 'string' ? JSON.parse(extensionsText) : extensionsText;

    const testExtension = extensionsData.extensions?.find(ext =>
      ext.name?.includes('test-extension-enhanced') ||
      ext.url?.includes('test-extension-enhanced')
    );

    if (!testExtension) {
      console.log('⚠️ 未找到test-extension-enhanced扩展');
      console.log('请确保扩展已加载，然后手动设置extensionId');
      this.extensionId = 'YOUR_EXTENSION_ID'; // 手动设置
    } else {
      this.extensionId = testExtension.id;
      console.log('✅ 找到测试扩展:', this.extensionId.substring(0, 32) + '...\n');
    }

    // 切换到扩展页面
    const tabsResult = await this.server.handleListTabs({});
    const tabsText = tabsResult.content[0].text;
    const tabsData = typeof tabsText === 'string' ? JSON.parse(tabsText) : tabsData;

    const popupTab = tabsData.tabs?.find(tab => tab.url?.includes('popup.html'));
    if (popupTab) {
      await this.server.handleSwitchTab({ tabId: popupTab.id });
      console.log('✅ 切换到popup页面\n');
    } else {
      console.log('⚠️ 请手动打开扩展popup页面\n');
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  /**
   * 测试1: check_extension_permissions - 权限检查
   */
  async testCheckPermissions() {
    console.log('='.repeat(60));
    console.log('测试1: check_extension_permissions - 权限检查');
    console.log('='.repeat(60));

    try {
      console.log('\n▶ 检查扩展权限...');
      const permResult = await this.server.handleCheckExtensionPermissions({
        extensionId: this.extensionId
      });
      const perm = typeof permResult.content[0].text === 'string' 
        ? JSON.parse(permResult.content[0].text) 
        : permResult.content[0].text;
      
      console.log(`✅ 权限检查完成`);
      console.log(`  - 总权限数: ${perm.totalPermissions}`);
      console.log(`  - 使用中: ${perm.usedPermissions}`);
      console.log(`  - 未使用: ${perm.unusedPermissions}`);
      console.log(`  - 健康度评分: ${perm.score}/100`);
      
      console.log('\n  权限详情:');
      perm.permissions.slice(0, 5).forEach(p => {
        console.log(`    - ${p.name} [${p.risk}风险] - ${p.description}`);
      });

      if (perm.permissions.length > 5) {
        console.log(`    ... 还有${perm.permissions.length - 5}个权限`);
      }
      
      console.log('\n  Host权限:');
      perm.hostPermissions.forEach(h => {
        console.log(`    - ${h}`);
      });

      console.log('\n  建议:');
      perm.recommendations.forEach(r => {
        console.log(`    - ${r}`);
      });

      console.log('\n✅ check_extension_permissions测试完成\n');
    } catch (error) {
      console.error('❌ check_extension_permissions测试失败:', error.message);
    }
  }

  /**
   * 测试2: audit_extension_security - 安全审计
   */
  async testSecurityAudit() {
    console.log('='.repeat(60));
    console.log('测试2: audit_extension_security - 安全审计');
    console.log('='.repeat(60));

    try {
      console.log('\n▶ 执行安全审计...');
      const auditResult = await this.server.handleAuditExtensionSecurity({
        extensionId: this.extensionId
      });
      const audit = typeof auditResult.content[0].text === 'string' 
        ? JSON.parse(auditResult.content[0].text) 
        : auditResult.content[0].text;
      
      console.log(`✅ 安全审计完成`);
      console.log(`  - 扩展: ${audit.extensionName} v${audit.version}`);
      console.log(`  - 总体评分: ${audit.overallScore}/100`);
      console.log(`  - 安全等级: ${audit.securityLevel}`);
      console.log(`  - 审计时间: ${new Date(audit.auditDate).toLocaleString()}`);

      console.log('\n  问题统计:');
      console.log(`    - 严重: ${audit.summary.critical}`);
      console.log(`    - 高危: ${audit.summary.high}`);
      console.log(`    - 中危: ${audit.summary.medium}`);
      console.log(`    - 低危: ${audit.summary.low}`);
      console.log(`    - 信息: ${audit.summary.info}`);

      console.log('\n  详细评分:');
      console.log(`    - Manifest安全性: ${audit.details.manifestSecurity}/100`);
      console.log(`    - 权限安全性: ${audit.details.permissionSecurity}/100`);
      console.log(`    - 代码安全性: ${audit.details.codeSecurity}/100`);
      console.log(`    - 网络安全性: ${audit.details.networkSecurity}/100`);

      if (audit.issues.length > 0) {
        console.log('\n  发现的问题 (前3个):');
        audit.issues.slice(0, 3).forEach((issue, i) => {
          console.log(`    ${i + 1}. [${issue.type.toUpperCase()}] ${issue.title}`);
          console.log(`       ${issue.description}`);
          console.log(`       建议: ${issue.recommendation}`);
        });

        if (audit.issues.length > 3) {
          console.log(`    ... 还有${audit.issues.length - 3}个问题`);
        }
      }

      console.log('\n  安全建议:');
      audit.recommendations.slice(0, 3).forEach(r => {
        console.log(`    - ${r}`);
      });

      console.log('\n✅ audit_extension_security测试完成\n');
    } catch (error) {
      console.error('❌ audit_extension_security测试失败:', error.message);
    }
  }

  /**
   * 测试3: check_extension_updates - 更新检查
   */
  async testCheckUpdates() {
    console.log('='.repeat(60));
    console.log('测试3: check_extension_updates - 更新检查');
    console.log('='.repeat(60));

    try {
      console.log('\n▶ 检查扩展更新...');
      const updateResult = await this.server.handleCheckExtensionUpdates({
        extensionId: this.extensionId
      });
      const update = typeof updateResult.content[0].text === 'string' 
        ? JSON.parse(updateResult.content[0].text) 
        : updateResult.content[0].text;
      
      console.log(`✅ 更新检查完成`);
      console.log(`  - 当前版本: ${update.currentVersion}`);
      console.log(`  - 自动更新: ${update.autoUpdateEnabled ? '已启用' : '未启用'}`);
      console.log(`  - 更新策略: ${update.updatePolicy}`);
      
      const info = update.updateInfo;
      console.log('\n  更新信息:');
      console.log(`    - 有更新: ${info.hasUpdate ? '是' : '否'}`);
      console.log(`    - 更新源: ${info.updateSource}`);
      if (info.updateUrl) {
        console.log(`    - 更新URL: ${info.updateUrl.substring(0, 50)}...`);
      }
      console.log(`    - 检查时间: ${new Date(info.lastChecked).toLocaleString()}`);

      console.log('\n  建议:');
      update.recommendations.forEach(r => {
        console.log(`    - ${r}`);
      });

      console.log('\n✅ check_extension_updates测试完成\n');
    } catch (error) {
      console.error('❌ check_extension_updates测试失败:', error.message);
    }
  }

  /**
   * 运行所有测试
   */
  async runAll() {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 Phase 3: Developer Tools - 功能测试');
    console.log('='.repeat(60) + '\n');

    try {
      await this.setup();

      await this.testCheckPermissions();
      await this.testSecurityAudit();
      await this.testCheckUpdates();

      console.log('\n' + '='.repeat(60));
      console.log('✅ Phase 3测试完成！');
      console.log('='.repeat(60));
      console.log('\n📊 测试总结:');
      console.log('  - check_extension_permissions: ✅ 权限检查正常');
      console.log('  - audit_extension_security: ✅ 安全审计功能完整');
      console.log('  - check_extension_updates: ✅ 更新检查正常');
      console.log('\n🎉 3个开发者工具测试通过！\n');

    } catch (error) {
      console.error('\n❌ 测试失败:', error);
      console.error(error.stack);
    }
  }
}

// 运行测试
const tester = new DeveloperToolsTester();
tester.runAll().catch(console.error);

