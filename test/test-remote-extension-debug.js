/**
 * 远程扩展调试实战演示
 * 调试 /home/p/workspace/videoSrtExt/extension-mvp 插件
 * 带超时保护，防止卡住
 */

import { ChromeDebugServer } from '../build/ChromeDebugServer.js';
import path from 'path';

class RemoteExtensionDebugger {
  constructor() {
    this.server = new ChromeDebugServer();
    this.extensionPath = '/home/p/workspace/videoSrtExt/extension-mvp';
    this.targetExtension = null;
  }

  // 超时包装器
  async withTimeout(promise, timeoutMs, description) {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`${description} 超时 (${timeoutMs}ms)`)), timeoutMs)
      )
    ]);
  }

  async debugExtension() {
    console.log('🔍 开始远程扩展调试实战');
    console.log('=====================================');
    console.log(`🎯 目标扩展: ${this.extensionPath}`);
    console.log(`🌐 连接端口: 9222`);

    try {
      // 1. 连接远程Chrome (3秒超时)
      console.log('\n📡 1. 连接远程Chrome...');
      await this.withTimeout(
        this.server.handleAttachToChrome({ host: 'localhost', port: 9222 }),
        3000,
        'Chrome远程连接'
      );
      console.log('   ✅ 远程连接成功');

      // 2. 检测页面状态 (5秒超时)
      console.log('\n📊 2. 检测页面状态...');
      const pageState = await this.withTimeout(
        this.server.extensionHandler.detectPageState(),
        5000,
        '页面状态检测'
      );
      
      console.log(`   📋 页面状态: ${pageState.state}`);
      console.log(`   🚫 是否阻塞: ${pageState.isBlocked}`);
      
      if (pageState.isBlocked) {
        console.log('   ⚠️ 页面被阻塞，可能影响调试');
        if (pageState.recommendations.length > 0) {
          console.log('   💡 建议:');
          pageState.recommendations.forEach(rec => console.log(`      - ${rec}`));
        }
      }

      // 3. 扫描所有扩展 (5秒超时)
      console.log('\n🔍 3. 扫描已加载的扩展...');
      const extensions = await this.withTimeout(
        this.server.extensionHandler.listExtensions({}),
        5000,
        '扩展列表扫描'
      );
      
      console.log(`   📦 发现 ${extensions.length} 个扩展:`);
      extensions.forEach((ext, i) => {
        console.log(`      ${i + 1}. ${ext.name || ext.id} (${ext.id})`);
        if (ext.description) {
          console.log(`         描述: ${ext.description.substring(0, 60)}...`);
        }
        console.log(`         状态: ${ext.enabled ? '✅ 启用' : '❌ 禁用'}`);
      });

      // 4. 查找目标扩展
      console.log('\n🎯 4. 查找videoSrtExt扩展...');
      this.targetExtension = extensions.find(ext => 
        ext.name?.toLowerCase().includes('srt') || 
        ext.name?.toLowerCase().includes('video') ||
        ext.description?.toLowerCase().includes('srt') ||
        ext.description?.toLowerCase().includes('subtitle')
      );

      if (this.targetExtension) {
        console.log(`   🎉 找到目标扩展: ${this.targetExtension.name}`);
        console.log(`   🆔 扩展ID: ${this.targetExtension.id}`);
        await this.analyzeTargetExtension();
      } else {
        console.log('   ⚠️ 未找到videoSrtExt扩展');
        console.log('   💡 可能原因:');
        console.log('      - 扩展未加载');
        console.log('      - 扩展路径不正确');
        console.log('      - Chrome启动时未使用--load-extension参数');
        
        await this.suggestExtensionLoading();
      }

      // 5. 扩展上下文分析 (5秒超时)
      console.log('\n🔄 5. 分析扩展上下文...');
      const contexts = await this.withTimeout(
        this.server.extensionHandler.listExtensionContexts({}),
        5000,
        '扩展上下文分析'
      );
      
      console.log(`   📋 发现 ${contexts.length} 个上下文:`);
      contexts.forEach(ctx => {
        console.log(`      - ${ctx.type}: ${ctx.url || ctx.id}`);
        if (ctx.extensionId && ctx.extensionId === this.targetExtension?.id) {
          console.log(`        🎯 属于目标扩展!`);
        }
      });

      // 6. 收集扩展日志 (3秒超时)
      console.log('\n📝 6. 收集扩展日志...');
      const logs = await this.withTimeout(
        this.server.extensionHandler.getExtensionLogs({
          extensionId: this.targetExtension?.id,
          sourceTypes: ['extension', 'service_worker', 'content_script']
        }),
        3000,
        '扩展日志收集'
      );
      
      console.log(`   📊 收集到 ${logs.length} 条日志`);
      if (logs.length > 0) {
        console.log('   🔍 最近的日志:');
        logs.slice(-5).forEach(log => {
          console.log(`      [${log.level}] ${log.message?.substring(0, 80)}...`);
        });
      }

      console.log('\n🎉 远程扩展调试完成！');
      
    } catch (error) {
      if (error.message.includes('超时')) {
        console.log(`⏱️ 调试超时: ${error.message}`);
        console.log('💡 这可能表明Chrome页面存在阻塞问题');
      } else {
        console.log(`❌ 调试失败: ${error.message}`);
        this.printTroubleshootingTips();
      }
    }
  }

  async analyzeTargetExtension() {
    console.log('\n🔬 深度分析目标扩展...');
    
    try {
      // 检查扩展存储 (3秒超时)
      console.log('   📦 检查扩展存储...');
      const storage = await this.withTimeout(
        this.server.extensionHandler.inspectExtensionStorage({
          extensionId: this.targetExtension.id,
          storageTypes: ['local', 'sync']
        }),
        3000,
        '扩展存储检查'
      );
      
      console.log(`      本地存储: ${Object.keys(storage.local || {}).length} 项`);
      console.log(`      同步存储: ${Object.keys(storage.sync || {}).length} 项`);

      // 检查内容脚本状态 (3秒超时)
      console.log('   📜 检查内容脚本状态...');
      const contentStatus = await this.withTimeout(
        this.server.extensionHandler.contentScriptStatus({
          extensionId: this.targetExtension.id
        }),
        3000,
        '内容脚本状态检查'
      );
      
      console.log(`      内容脚本状态: ${contentStatus.status || '未知'}`);
      if (contentStatus.injectedPages) {
        console.log(`      注入页面数: ${contentStatus.injectedPages.length}`);
      }

      // 启动扩展消息监控 (仅测试3秒)
      console.log('   📡 启动消息监控测试...');
      const monitoring = await this.withTimeout(
        this.server.extensionHandler.monitorExtensionMessages({
          extensionId: this.targetExtension.id,
          duration: 3000,
          includeResponses: true
        }),
        5000,
        '扩展消息监控'
      );
      
      console.log(`      监控结果: ${monitoring.messagesTracked || 0} 条消息`);
      
    } catch (error) {
      console.log(`   ⚠️ 深度分析部分失败: ${error.message}`);
    }
  }

  async suggestExtensionLoading() {
    console.log('\n💡 建议的扩展加载方法:');
    console.log('=====================================');
    
    // 检查扩展文件是否存在
    console.log('1. 检查扩展文件:');
    try {
      const fs = await import('fs');
      const manifestPath = path.join(this.extensionPath, 'manifest.json');
      
      if (fs.existsSync(manifestPath)) {
        console.log(`   ✅ 扩展目录存在: ${this.extensionPath}`);
        
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        console.log(`   📋 扩展名称: ${manifest.name}`);
        console.log(`   📋 版本: ${manifest.version}`);
        console.log(`   📋 清单版本: ${manifest.manifest_version}`);
        
        console.log('\n2. 推荐的Chrome启动命令:');
        console.log('```bash');
        console.log('google-chrome \\');
        console.log('  --remote-debugging-port=9222 \\');
        console.log('  --user-data-dir=/tmp/chrome-debug \\');
        console.log(`  --load-extension="${this.extensionPath}" \\`);
        console.log('  --no-first-run \\');
        console.log('  --no-default-browser-check \\');
        console.log('  --disable-features=VizDisplayCompositor');
        console.log('```');
        
      } else {
        console.log(`   ❌ 扩展目录不存在: ${this.extensionPath}`);
        console.log('   💡 请检查路径是否正确');
      }
    } catch (error) {
      console.log(`   ⚠️ 文件检查失败: ${error.message}`);
    }
  }

  printTroubleshootingTips() {
    console.log('\n🔧 故障排除建议:');
    console.log('=====================================');
    console.log('1. 检查Chrome是否在端口9222运行:');
    console.log('   curl http://localhost:9222/json/version');
    console.log('\n2. 检查是否有页面阻塞:');
    console.log('   使用PageStateMonitor检测页面状态');
    console.log('\n3. 重启Chrome调试模式:');
    console.log('   pkill chrome && 重新启动带调试参数的Chrome');
    console.log('\n4. 检查扩展权限:');
    console.log('   确保manifest.json格式正确');
  }
}

// 执行远程调试，带全局超时保护
const extensionDebugger = new RemoteExtensionDebugger();

// 全局超时保护 - 30秒后强制退出
setTimeout(() => {
  console.log('🚨 远程调试全局超时，强制退出');
  process.exit(1);
}, 30000);

extensionDebugger.debugExtension().catch(error => {
  console.log('💥 远程调试执行失败:', error.message);
}).finally(() => {
  console.log('🔚 远程扩展调试完成');
  process.exit(0);
});
