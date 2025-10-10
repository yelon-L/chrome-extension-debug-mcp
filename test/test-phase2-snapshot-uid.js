/**
 * Phase 2.1: DOM Snapshot & UID Locator System 测试
 * 
 * 测试4个新工具：
 * 1. take_snapshot - 生成DOM快照
 * 2. click_by_uid - 通过UID点击元素
 * 3. fill_by_uid - 通过UID填充元素
 * 4. hover_by_uid - 通过UID悬停元素
 */

import { ChromeDebugServer } from '../build/ChromeDebugServer.js';

class Phase2SnapshotUIDTester {
  constructor() {
    this.server = new ChromeDebugServer();
    this.extensionId = '';
    this.testResults = [];
    this.snapshotText = '';
  }

  async setup() {
    console.log('\n🚀 Phase 2.1: DOM Snapshot & UID Locator 测试\n');
    console.log('='.repeat(60));
    
    // 连接到Chrome
    const attachResult = await this.server.handleAttachToChrome({
      host: 'localhost',
      port: 9222
    });
    console.log('✅ 已连接到Chrome');
    
    // 获取标签页
    const tabsResult = await this.server.handleListTabs({});
    const tabsText = tabsResult.content[0].text;
    const tabsData = typeof tabsText === 'string' ? JSON.parse(tabsText) : tabsText;
    
    if (!tabsData.tabs || tabsData.tabs.length === 0) {
      console.log('⚠️ 请先在Chrome中打开扩展popup页面');
      process.exit(1);
    }
    
    // 查找扩展popup标签
    const popupTab = tabsData.tabs.find(tab => 
      tab.url && (tab.url.includes('chrome-extension://') && tab.url.includes('popup.html'))
    );
    
    if (popupTab) {
      await this.server.handleSwitchTab({ tabId: popupTab.id });
      console.log('✅ 已切换到扩展popup页面');
    } else {
      console.log('⚠️ 未找到popup页面，使用第一个标签页');
      await this.server.handleSwitchTab({ tabId: tabsData.tabs[0].id });
    }
    
    console.log('');
  }

  async test1_TakeSnapshot() {
    console.log('\n📸 测试1: take_snapshot - 生成DOM快照');
    console.log('-'.repeat(60));
    
    try {
      const result = await this.server.handleTakeSnapshot({
        includeHidden: false,
        maxDepth: 5,
        includeText: true
      });
      
      const data = JSON.parse(result.content[0].text);
      
      if (data.success) {
        console.log(`✅ 快照生成成功`);
        console.log(`  元素数量: ${data.elementCount}`);
        console.log(`  快照文本长度: ${data.textRepresentation?.length || 0} 字符`);
        
        // 保存快照文本以供后续测试使用
        this.snapshotText = data.textRepresentation || '';
        
        // 显示快照的前几行
        const lines = this.snapshotText.split('\n');
        console.log('\n  快照预览（前10行）:');
        lines.slice(0, 10).forEach(line => {
          console.log(`  ${line}`);
        });
        
        this.testResults.push({ 
          name: 'take_snapshot', 
          status: '✅ 通过', 
          details: `${data.elementCount}个元素` 
        });
      } else {
        console.error(`❌ 快照生成失败: ${data.error}`);
        this.testResults.push({ 
          name: 'take_snapshot', 
          status: '❌ 失败', 
          error: data.error 
        });
      }
    } catch (error) {
      console.error('❌ 测试失败:', error.message);
      this.testResults.push({ 
        name: 'take_snapshot', 
        status: '❌ 失败', 
        error: error.message 
        });
    }
  }

  async test2_ClickByUid() {
    console.log('\n🖱️ 测试2: click_by_uid - 通过UID点击元素');
    console.log('-'.repeat(60));
    
    try {
      // 从快照文本中找到一个按钮的UID
      const lines = this.snapshotText.split('\n');
      const buttonLine = lines.find(line => line.includes('<button>') && line.includes('测试按钮1'));
      
      if (!buttonLine) {
        console.log('⚠️ 未在快照中找到测试按钮，跳过测试');
        this.testResults.push({ 
          name: 'click_by_uid', 
          status: '⚠️ 跳过', 
          details: '未找到目标元素' 
        });
        return;
      }
      
      // 提取UID
      const uidMatch = buttonLine.match(/\[([^\]]+)\]/);
      if (!uidMatch) {
        console.log('⚠️ 无法提取UID，跳过测试');
        this.testResults.push({ 
          name: 'click_by_uid', 
          status: '⚠️ 跳过', 
          details: '无法提取UID' 
        });
        return;
      }
      
      const uid = uidMatch[1];
      console.log(`  目标按钮UID: ${uid}`);
      console.log(`  元素信息: ${buttonLine.trim()}`);
      
      // 执行点击
      const result = await this.server.handleClickByUid({ uid });
      const data = JSON.parse(result.content[0].text);
      
      if (data.success && data.clicked) {
        console.log(`  ✅ 点击成功`);
        
        // 等待一下，然后验证点击效果
        await new Promise(resolve => setTimeout(resolve, 500));
        
        this.testResults.push({ 
          name: 'click_by_uid', 
          status: '✅ 通过', 
          details: `成功点击 ${uid}` 
        });
      } else {
        console.error(`  ❌ 点击失败: ${data.error}`);
        this.testResults.push({ 
          name: 'click_by_uid', 
          status: '❌ 失败', 
          error: data.error 
        });
      }
    } catch (error) {
      console.error('❌ 测试失败:', error.message);
      this.testResults.push({ 
        name: 'click_by_uid', 
        status: '❌ 失败', 
        error: error.message 
      });
    }
  }

  async test3_FillByUid() {
    console.log('\n✏️ 测试3: fill_by_uid - 通过UID填充元素');
    console.log('-'.repeat(60));
    
    try {
      // 从快照文本中找到输入框的UID
      const lines = this.snapshotText.split('\n');
      const inputLine = lines.find(line => 
        line.includes('<input>') && line.includes('type="text"')
      );
      
      if (!inputLine) {
        console.log('⚠️ 未在快照中找到输入框，跳过测试');
        this.testResults.push({ 
          name: 'fill_by_uid', 
          status: '⚠️ 跳过', 
          details: '未找到目标元素' 
        });
        return;
      }
      
      // 提取UID
      const uidMatch = inputLine.match(/\[([^\]]+)\]/);
      if (!uidMatch) {
        console.log('⚠️ 无法提取UID，跳过测试');
        this.testResults.push({ 
          name: 'fill_by_uid', 
          status: '⚠️ 跳过', 
          details: '无法提取UID' 
        });
        return;
      }
      
      const uid = uidMatch[1];
      console.log(`  目标输入框UID: ${uid}`);
      console.log(`  元素信息: ${inputLine.trim()}`);
      
      const testValue = 'Phase 2.1 测试成功!';
      
      // 执行填充
      const result = await this.server.handleFillByUid({ 
        uid, 
        value: testValue,
        clear: true
      });
      const data = JSON.parse(result.content[0].text);
      
      if (data.success && data.filled) {
        console.log(`  ✅ 填充成功`);
        console.log(`  填充值: "${data.value}"`);
        
        this.testResults.push({ 
          name: 'fill_by_uid', 
          status: '✅ 通过', 
          details: `成功填充 ${uid}` 
        });
      } else {
        console.error(`  ❌ 填充失败: ${data.error}`);
        this.testResults.push({ 
          name: 'fill_by_uid', 
          status: '❌ 失败', 
          error: data.error 
        });
      }
    } catch (error) {
      console.error('❌ 测试失败:', error.message);
      this.testResults.push({ 
        name: 'fill_by_uid', 
        status: '❌ 失败', 
        error: error.message 
      });
    }
  }

  async test4_HoverByUid() {
    console.log('\n👆 测试4: hover_by_uid - 通过UID悬停元素');
    console.log('-'.repeat(60));
    
    try {
      // 从快照文本中找到可悬停元素的UID
      const lines = this.snapshotText.split('\n');
      const hoverLine = lines.find(line => 
        line.includes('悬停') || line.includes('hover')
      );
      
      if (!hoverLine) {
        console.log('⚠️ 未在快照中找到可悬停元素，跳过测试');
        this.testResults.push({ 
          name: 'hover_by_uid', 
          status: '⚠️ 跳过', 
          details: '未找到目标元素' 
        });
        return;
      }
      
      // 提取UID
      const uidMatch = hoverLine.match(/\[([^\]]+)\]/);
      if (!uidMatch) {
        console.log('⚠️ 无法提取UID，跳过测试');
        this.testResults.push({ 
          name: 'hover_by_uid', 
          status: '⚠️ 跳过', 
          details: '无法提取UID' 
        });
        return;
      }
      
      const uid = uidMatch[1];
      console.log(`  目标元素UID: ${uid}`);
      console.log(`  元素信息: ${hoverLine.trim()}`);
      
      // 执行悬停
      const result = await this.server.handleHoverByUid({ uid });
      const data = JSON.parse(result.content[0].text);
      
      if (data.success && data.hovered) {
        console.log(`  ✅ 悬停成功`);
        
        // 等待一下观察效果
        await new Promise(resolve => setTimeout(resolve, 500));
        
        this.testResults.push({ 
          name: 'hover_by_uid', 
          status: '✅ 通过', 
          details: `成功悬停 ${uid}` 
        });
      } else {
        console.error(`  ❌ 悬停失败: ${data.error}`);
        this.testResults.push({ 
          name: 'hover_by_uid', 
          status: '❌ 失败', 
          error: data.error 
        });
      }
    } catch (error) {
      console.error('❌ 测试失败:', error.message);
      this.testResults.push({ 
        name: 'hover_by_uid', 
          status: '❌ 失败', 
        error: error.message 
      });
    }
  }

  async generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 Phase 2.1 测试报告');
    console.log('='.repeat(60));
    
    const passCount = this.testResults.filter(r => r.status.includes('✅')).length;
    const failCount = this.testResults.filter(r => r.status.includes('❌')).length;
    const skipCount = this.testResults.filter(r => r.status.includes('⚠️')).length;
    
    console.log('\n测试结果汇总:');
    this.testResults.forEach((result, i) => {
      console.log(`${i+1}. ${result.name}: ${result.status}`);
      if (result.details) {
        console.log(`   ${result.details}`);
      }
      if (result.error) {
        console.log(`   错误: ${result.error}`);
      }
    });
    
    console.log('\n统计:');
    console.log(`✅ 通过: ${passCount}/${this.testResults.length}`);
    console.log(`❌ 失败: ${failCount}/${this.testResults.length}`);
    console.log(`⚠️ 跳过: ${skipCount}/${this.testResults.length}`);
    
    const successRate = ((passCount / (this.testResults.length - skipCount)) * 100).toFixed(1);
    console.log(`\n成功率: ${successRate}%`);
    
    if (failCount === 0 && passCount > 0) {
      console.log('\n🎉 Phase 2.1: DOM Snapshot & UID Locator - 全部测试通过！');
    } else if (failCount > 0) {
      console.log('\n⚠️ 部分测试失败，需要修复');
    }
    
    console.log('\n' + '='.repeat(60));
  }

  async run() {
    try {
      await this.setup();
      
      await this.test1_TakeSnapshot();
      await this.test2_ClickByUid();
      await this.test3_FillByUid();
      await this.test4_HoverByUid();
      
      await this.generateReport();
      
      process.exit(0);
    } catch (error) {
      console.error('\n💥 测试过程出错:', error);
      console.error(error.stack);
      process.exit(1);
    }
  }
}

// 运行测试
const tester = new Phase2SnapshotUIDTester();
tester.run().catch(console.error);

