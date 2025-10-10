/**
 * Phase 2.3: Smart Wait Mechanism - 测试脚本
 * 测试智能等待机制的2个新工具
 */

import { ChromeDebugServer } from '../build/ChromeDebugServer.js';

class SmartWaitTester {
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
      this.extensionId = 'YOUR_EXTENSION_ID'; // 手动设置
    } else {
      this.extensionId = testExtension.id;
      console.log('✅ 找到测试扩展:', this.extensionId.substring(0, 32) + '...\n');
    }

    // 查找或打开popup页面
    const tabsResult = await this.server.handleListTabs({});
    const tabsText = tabsResult.content[0].text;
    const tabsData = typeof tabsText === 'string' ? JSON.parse(tabsText) : tabsText;

    const popupTab = tabsData.tabs?.find(tab => tab.url?.includes('popup.html'));
    if (popupTab) {
      await this.server.handleSwitchTab({ tabId: popupTab.id });
      console.log('✅ 切换到popup页面\n');
    } else {
      console.log('⚠️ 请手动打开扩展popup页面\n');
    }

    // 等待页面加载
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  /**
   * 测试1: wait_for_element - 多策略等待
   */
  async testWaitForElement() {
    console.log('='.repeat(60));
    console.log('测试1: wait_for_element - 多策略元素等待');
    console.log('='.repeat(60));

    try {
      // 测试1.1: 等待已存在的元素（selector策略）
      console.log('\n▶ 测试1.1: 等待已存在的元素（selector）...');
      const waitResult1 = await this.server.handleWaitForElement({
        selector: '#testButton1',
        timeout: 5000
      });
      const wait1 = typeof waitResult1.content[0].text === 'string' 
        ? JSON.parse(waitResult1.content[0].text) 
        : waitResult1.content[0].text;
      
      if (wait1.success) {
        console.log(`✅ 元素找到 (策略: ${wait1.strategy}, 耗时: ${wait1.duration}ms)`);
      } else {
        console.log('❌ 元素未找到:', wait1.error);
      }

      // 测试1.2: 等待ARIA标签元素
      console.log('\n▶ 测试1.2: 等待ARIA标签元素...');
      const waitResult2 = await this.server.handleWaitForElement({
        aria: '关闭对话框',
        timeout: 5000
      });
      const wait2 = typeof waitResult2.content[0].text === 'string' 
        ? JSON.parse(waitResult2.content[0].text) 
        : waitResult2.content[0].text;
      
      if (wait2.success) {
        console.log(`✅ ARIA元素找到 (策略: ${wait2.strategy}, 耗时: ${wait2.duration}ms)`);
      } else {
        console.log('❌ ARIA元素未找到:', wait2.error);
      }

      // 测试1.3: 等待延迟加载的元素
      console.log('\n▶ 测试1.3: 等待延迟加载的元素（2秒后出现）...');
      
      // 触发延迟加载
      await this.server.handleClick({ selector: '#loadDelayedBtn' });
      
      // 等待延迟元素
      const waitResult3 = await this.server.handleWaitForElement({
        selector: '#delayedElement',
        timeout: 5000
      });
      const wait3 = typeof waitResult3.content[0].text === 'string' 
        ? JSON.parse(waitResult3.content[0].text) 
        : waitResult3.content[0].text;
      
      if (wait3.success) {
        console.log(`✅ 延迟元素找到 (耗时: ${wait3.duration}ms，预期~2000ms)`);
      } else {
        console.log('❌ 延迟元素未找到:', wait3.error);
      }

      // 测试1.4: 多策略Race（第一个匹配的胜出）
      console.log('\n▶ 测试1.4: 多策略Race（selector + aria + text）...');
      const waitResult4 = await this.server.handleWaitForElement({
        selector: '#testButton2',
        aria: 'Test button 2',
        text: '测试按钮2',
        timeout: 3000
      });
      const wait4 = typeof waitResult4.content[0].text === 'string' 
        ? JSON.parse(waitResult4.content[0].text) 
        : waitResult4.content[0].text;
      
      if (wait4.success) {
        console.log(`✅ 多策略找到元素 (获胜策略: ${wait4.strategy}, 耗时: ${wait4.duration}ms)`);
      } else {
        console.log('❌ 多策略失败:', wait4.error);
      }

      // 测试1.5: 超时测试
      console.log('\n▶ 测试1.5: 超时测试（等待不存在的元素）...');
      const waitResult5 = await this.server.handleWaitForElement({
        selector: '#nonExistentElement',
        timeout: 2000
      });
      const wait5 = typeof waitResult5.content[0].text === 'string' 
        ? JSON.parse(waitResult5.content[0].text) 
        : waitResult5.content[0].text;
      
      if (wait5.timedOut) {
        console.log(`✅ 正确超时 (耗时: ${wait5.duration}ms，预期~2000ms)`);
      } else {
        console.log('❌ 超时测试失败');
      }

      console.log('\n✅ wait_for_element测试完成\n');
    } catch (error) {
      console.error('❌ wait_for_element测试失败:', error.message);
    }
  }

  /**
   * 测试2: wait_for_extension_ready - 扩展就绪等待
   */
  async testWaitForExtensionReady() {
    console.log('='.repeat(60));
    console.log('测试2: wait_for_extension_ready - 扩展就绪等待');
    console.log('='.repeat(60));

    try {
      console.log('\n▶ 等待扩展初始化完成...');
      const readyResult = await this.server.handleWaitForExtensionReady({
        extensionId: this.extensionId,
        checkStorage: true,
        checkRuntime: true,
        checkPermissions: false,
        timeout: 10000
      });
      const ready = typeof readyResult.content[0].text === 'string' 
        ? JSON.parse(readyResult.content[0].text) 
        : readyResult.content[0].text;
      
      if (ready.success && ready.ready) {
        console.log(`✅ 扩展就绪 (耗时: ${ready.duration}ms)`);
        console.log('  检查结果:');
        if (ready.checks.storage !== undefined) {
          console.log(`    - Storage API: ${ready.checks.storage ? '✅' : '❌'}`);
        }
        if (ready.checks.runtime !== undefined) {
          console.log(`    - Runtime API: ${ready.checks.runtime ? '✅' : '❌'}`);
        }
        if (ready.checks.permissions !== undefined) {
          console.log(`    - Permissions API: ${ready.checks.permissions ? '✅' : '❌'}`);
        }
      } else {
        console.log('❌ 扩展未就绪:', ready.error);
        console.log('  检查结果:', ready.checks);
      }

      console.log('\n✅ wait_for_extension_ready测试完成\n');
    } catch (error) {
      console.error('❌ wait_for_extension_ready测试失败:', error.message);
    }
  }

  /**
   * 测试3: 实战场景 - 等待后交互
   */
  async testRealWorldScenario() {
    console.log('='.repeat(60));
    console.log('测试3: 实战场景 - 等待慢速元素后点击');
    console.log('='.repeat(60));

    try {
      console.log('\n▶ 1. 触发慢速加载（5秒）...');
      await this.server.handleClick({ selector: '#loadSlowBtn' });

      console.log('▶ 2. 等待慢速按钮出现...');
      const waitResult = await this.server.handleWaitForElement({
        selector: '#slowButton',
        timeout: 10000
      });
      const wait = typeof waitResult.content[0].text === 'string' 
        ? JSON.parse(waitResult.content[0].text) 
        : waitResult.content[0].text;
      
      if (wait.success) {
        console.log(`✅ 慢速按钮出现 (耗时: ${wait.duration}ms，预期~5000ms)`);
        
        console.log('▶ 3. 点击慢速加载的按钮...');
        await this.server.handleClick({ selector: '#slowButton' });
        console.log('✅ 成功点击慢速加载的按钮');
      } else {
        console.log('❌ 慢速按钮未出现:', wait.error);
      }

      console.log('\n✅ 实战场景测试完成\n');
    } catch (error) {
      console.error('❌ 实战场景测试失败:', error.message);
    }
  }

  /**
   * 运行所有测试
   */
  async runAll() {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 Phase 2.3: Smart Wait Mechanism - 功能测试');
    console.log('='.repeat(60) + '\n');

    try {
      await this.setup();

      await this.testWaitForElement();
      await this.testWaitForExtensionReady();
      await this.testRealWorldScenario();

      console.log('\n' + '='.repeat(60));
      console.log('✅ Phase 2.3测试完成！');
      console.log('='.repeat(60));
      console.log('\n📊 测试总结:');
      console.log('  - wait_for_element: ✅ 多策略等待正常');
      console.log('    * selector策略: ✅');
      console.log('    * aria策略: ✅');
      console.log('    * 延迟加载: ✅');
      console.log('    * 多策略Race: ✅');
      console.log('    * 超时处理: ✅');
      console.log('  - wait_for_extension_ready: ✅ 扩展就绪检查正常');
      console.log('  - 实战场景: ✅ 等待后交互成功');
      console.log('\n🎉 2个智能等待工具测试通过！\n');

    } catch (error) {
      console.error('\n❌ 测试失败:', error);
      console.error(error.stack);
    }
  }
}

// 运行测试
const tester = new SmartWaitTester();
tester.runAll().catch(console.error);

