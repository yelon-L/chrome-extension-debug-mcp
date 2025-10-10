/**
 * UID-based智能元素定位模块
 * Phase 4: 交互与快照增强 - 4.3 核心功能
 */
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
const log = (...args) => console.error('[ElementLocator]', ...args);
export class ElementLocator {
    chromeManager;
    pageManager;
    uidCache = new Map();
    stabilityMonitor = new Map();
    constructor(chromeManager, pageManager) {
        this.chromeManager = chromeManager;
        this.pageManager = pageManager;
    }
    /**
     * 生成稳定的元素选择器
     */
    async generateStableSelector(options) {
        try {
            log('Generating stable selector', options);
            const page = await this.pageManager.getActivePage();
            if (!page) {
                throw new McpError(ErrorCode.InternalError, 'No active page available');
            }
            // 获取目标元素
            let targetElement = null;
            if (options.targetElement) {
                targetElement = options.targetElement;
            }
            else if (options.coordinates) {
                targetElement = await this.getElementAtCoordinates(options.coordinates.x, options.coordinates.y);
            }
            else if (options.textContent) {
                targetElement = await this.findElementByText(options.textContent);
            }
            else {
                throw new McpError(ErrorCode.InvalidParams, 'Must specify target element, coordinates, or text content');
            }
            // 生成多种选择器策略
            const selectors = await this.generateMultipleSelectors(targetElement, options.analysisDepth || 3);
            // 分析选择器质量
            const analysisResults = await this.analyzeSelectors(selectors);
            // 选择推荐和备用选择器
            const recommended = this.selectBestSelector(selectors);
            const backup = this.selectBackupSelectors(selectors, recommended);
            return {
                selectors,
                recommended,
                backup,
                analysis: analysisResults
            };
        }
        catch (error) {
            log('Stable selector generation failed:', error);
            throw new McpError(ErrorCode.InternalError, `Selector generation failed: ${error.message}`);
        }
    }
    /**
     * 按内容查找元素
     */
    async findElementByContent(options) {
        try {
            log('Finding elements by content', options);
            const page = await this.pageManager.getActivePage();
            if (!page) {
                throw new McpError(ErrorCode.InternalError, 'No active page available');
            }
            const searchScript = `
        (() => {
          const options = ${JSON.stringify(options)};
          const results = [];
          const startTime = performance.now();
          let elementsScanned = 0;

          // 构建选择器
          let selector = '*';
          if (options.tag) {
            selector = options.tag;
          }

          const elements = document.querySelectorAll(selector);
          elementsScanned = elements.length;

          for (const element of elements) {
            const text = element.textContent || '';
            const innerText = element.innerText || '';
            
            let matches = false;
            if (options.exactMatch) {
              matches = text.trim() === options.textContent.trim() || 
                       innerText.trim() === options.textContent.trim();
            } else {
              const searchText = options.textContent.toLowerCase();
              matches = text.toLowerCase().includes(searchText) || 
                       innerText.toLowerCase().includes(searchText);
            }

            if (matches) {
              // 检查可见性
              if (!options.includeHidden) {
                const style = window.getComputedStyle(element);
                if (style.display === 'none' || style.visibility === 'hidden' || 
                    style.opacity === '0') {
                  continue;
                }
              }

              const rect = element.getBoundingClientRect();
              const selector = generateElementSelector(element);
              
              results.push({
                selector: selector,
                uid: generateElementUID(element),
                confidence: calculateTextMatchConfidence(element, options.textContent),
                strategy: 'text_content',
                bounds: {
                  x: rect.x,
                  y: rect.y,
                  width: rect.width,
                  height: rect.height
                }
              });

              if (options.maxResults && results.length >= options.maxResults) {
                break;
              }
            }
          }

          const endTime = performance.now();
          return {
            results: results,
            performance: {
              searchTimeMs: endTime - startTime,
              strategiesTried: 1,
              elementsScanned: elementsScanned
            }
          };

          // 辅助函数
          function generateElementSelector(element) {
            if (element.id) {
              return '#' + element.id;
            }
            
            if (element.className) {
              const classes = element.className.split(' ').filter(c => c.trim());
              if (classes.length > 0) {
                return '.' + classes.join('.');
              }
            }

            // 生成标签 + 属性选择器
            let selector = element.tagName.toLowerCase();
            
            // 添加有用的属性
            const attributes = ['name', 'type', 'data-testid', 'aria-label'];
            for (const attr of attributes) {
              const value = element.getAttribute(attr);
              if (value) {
                selector += \`[\${attr}="\${value}"]\`;
                break;
              }
            }

            return selector;
          }

          function generateElementUID(element) {
            const attributes = {};
            for (const attr of element.attributes) {
              attributes[attr.name] = attr.value;
            }
            
            const hierarchy = [];
            let current = element;
            while (current && current !== document.body) {
              hierarchy.unshift(current.tagName.toLowerCase());
              current = current.parentElement;
            }

            // 使用encodeURIComponent + btoa 处理Unicode字符
            return btoa(encodeURIComponent(JSON.stringify({
              tag: element.tagName.toLowerCase(),
              attributes: attributes,
              hierarchy: hierarchy,
              text: (element.textContent || '').substring(0, 100)
            })));
          }

          function calculateTextMatchConfidence(element, searchText) {
            const text = (element.textContent || '').toLowerCase();
            const search = searchText.toLowerCase();
            
            if (text === search) return 100;
            if (text.includes(search)) {
              return Math.max(50, 100 - (text.length - search.length) * 2);
            }
            return 0;
          }
        })();
      `;
            const result = await page.evaluate(searchScript);
            const data = result;
            return data.results.map((item) => ({
                found: true,
                element: item,
                alternatives: [],
                performance: data.performance
            }));
        }
        catch (error) {
            log('Element content search failed:', error);
            throw new McpError(ErrorCode.InternalError, `Content search failed: ${error.message}`);
        }
    }
    /**
     * 分析DOM稳定性
     */
    async analyzeDOMStability(options) {
        try {
            log('Starting DOM stability analysis', options);
            const page = await this.pageManager.getActivePage();
            if (!page) {
                throw new McpError(ErrorCode.InternalError, 'No active page available');
            }
            const monitorDuration = options.monitorDuration || 10000; // 10秒
            const samplingInterval = options.samplingInterval || 1000; // 1秒
            const snapshots = [];
            // 注入监控脚本
            await page.evaluate(`
        window.domStabilityMonitor = {
          snapshots: [],
          changes: {
            structural: 0,
            attribute: 0,
            content: 0,
            position: 0
          },
          
          takeSnapshot: function() {
            const focusSelector = '${options.focusSelector || 'body'}';
            const rootElement = document.querySelector(focusSelector) || document.body;
            
            const snapshot = {
              timestamp: Date.now(),
              elementCount: rootElement.querySelectorAll('*').length,
              majorChanges: [],
              elementMap: new Map()
            };

            // 记录所有元素的状态
            const elements = rootElement.querySelectorAll('*');
            elements.forEach((el, index) => {
              const rect = el.getBoundingClientRect();
              snapshot.elementMap.set(index, {
                tag: el.tagName,
                id: el.id,
                className: el.className,
                textContent: (el.textContent || '').substring(0, 50),
                x: rect.x,
                y: rect.y,
                width: rect.width,
                height: rect.height
              });
            });

            this.snapshots.push(snapshot);
            return snapshot;
          },

          compareSnapshots: function(snap1, snap2) {
            const changes = {
              structural: 0,
              attribute: 0,
              content: 0,  
              position: 0
            };

            // 比较元素数量变化
            if (Math.abs(snap1.elementCount - snap2.elementCount) > 2) {
              changes.structural++;
              snap2.majorChanges.push(\`Element count changed: \${snap1.elementCount} -> \${snap2.elementCount}\`);
            }

            // 比较具体元素变化
            const minSize = Math.min(snap1.elementMap.size, snap2.elementMap.size);
            for (let i = 0; i < minSize; i++) {
              const el1 = snap1.elementMap.get(i);
              const el2 = snap2.elementMap.get(i);
              
              if (!el1 || !el2) continue;

              // 属性变化
              if (el1.id !== el2.id || el1.className !== el2.className) {
                changes.attribute++;
              }

              // 内容变化
              if (el1.textContent !== el2.textContent) {
                changes.content++;
              }

              // 位置变化
              if (Math.abs(el1.x - el2.x) > 5 || Math.abs(el1.y - el2.y) > 5) {
                changes.position++;
              }
            }

            return changes;
          }
        };
      `);
            // 开始监控
            const startTime = Date.now();
            let lastSnapshot = await page.evaluate('window.domStabilityMonitor.takeSnapshot()');
            while (Date.now() - startTime < monitorDuration) {
                await new Promise(resolve => setTimeout(resolve, samplingInterval));
                const currentSnapshot = await page.evaluate('window.domStabilityMonitor.takeSnapshot()');
                const changes = await page.evaluate(`
          window.domStabilityMonitor.compareSnapshots(
            window.domStabilityMonitor.snapshots[window.domStabilityMonitor.snapshots.length - 2],
            window.domStabilityMonitor.snapshots[window.domStabilityMonitor.snapshots.length - 1]
          )
        `);
                snapshots.push({
                    timestamp: currentSnapshot.timestamp,
                    elementCount: currentSnapshot.elementCount,
                    majorChanges: currentSnapshot.majorChanges,
                    changes
                });
                lastSnapshot = currentSnapshot;
            }
            // 计算整体稳定性
            const totalChanges = snapshots.reduce((acc, snap) => {
                return {
                    structural: acc.structural + (snap.changes?.structural || 0),
                    attribute: acc.attribute + (snap.changes?.attribute || 0),
                    content: acc.content + (snap.changes?.content || 0),
                    position: acc.position + (snap.changes?.position || 0)
                };
            }, { structural: 0, attribute: 0, content: 0, position: 0 });
            const totalChangeCount = Object.values(totalChanges).reduce((a, b) => a + b, 0);
            const overallStability = Math.max(0, 100 - (totalChangeCount * 2));
            // 生成建议
            const recommendations = this.generateStabilityRecommendations(totalChanges, overallStability);
            // 清理监控脚本
            await page.evaluate('delete window.domStabilityMonitor');
            return {
                overallStability,
                analysis: totalChanges,
                recommendations,
                monitoringDuration: monitorDuration,
                snapshots: snapshots.map(s => ({
                    timestamp: s.timestamp,
                    elementCount: s.elementCount,
                    majorChanges: s.majorChanges
                }))
            };
        }
        catch (error) {
            log('DOM stability analysis failed:', error);
            throw new McpError(ErrorCode.InternalError, `Stability analysis failed: ${error.message}`);
        }
    }
    /**
     * 根据坐标获取元素
     */
    async getElementAtCoordinates(x, y) {
        const page = await this.pageManager.getActivePage();
        if (!page) {
            throw new McpError(ErrorCode.InternalError, 'No active page available');
        }
        const script = `
      (() => {
        const element = document.elementFromPoint(${x}, ${y});
        if (!element) return null;
        
        // 生成选择器
        if (element.id) return '#' + element.id;
        if (element.className) {
          const classes = element.className.split(' ').filter(c => c.trim());
          if (classes.length > 0) return '.' + classes.join('.');
        }
        return element.tagName.toLowerCase();
      })();
    `;
        const result = await page.evaluate(script);
        if (!result) {
            throw new McpError(ErrorCode.InvalidParams, `No element found at coordinates (${x}, ${y})`);
        }
        return result;
    }
    /**
     * 根据文本查找元素
     */
    async findElementByText(textContent) {
        const page = await this.pageManager.getActivePage();
        if (!page) {
            throw new McpError(ErrorCode.InternalError, 'No active page available');
        }
        const script = `
      (() => {
        const text = '${textContent}';
        const elements = document.querySelectorAll('*');
        
        for (const element of elements) {
          if (element.textContent && element.textContent.includes(text)) {
            if (element.id) return '#' + element.id;
            if (element.className) {
              const classes = element.className.split(' ').filter(c => c.trim());
              if (classes.length > 0) return '.' + classes.join('.');
            }
            return element.tagName.toLowerCase();
          }
        }
        
        return null;
      })();
    `;
        const result = await page.evaluate(script);
        if (!result) {
            throw new McpError(ErrorCode.InvalidParams, `No element found with text content: ${textContent}`);
        }
        return result;
    }
    /**
     * 生成多种选择器策略
     */
    async generateMultipleSelectors(targetElement, depth) {
        const page = await this.pageManager.getActivePage();
        if (!page) {
            throw new McpError(ErrorCode.InternalError, 'No active page available');
        }
        const script = `
      (() => {
        const selector = '${targetElement}';
        const element = document.querySelector(selector);
        if (!element) return [];

        const selectors = [];

        // ID选择器 (最高优先级)
        if (element.id) {
          selectors.push({
            selector: '#' + element.id,
            strategy: 'id',
            confidence: 95,
            stability: 90,
            specificity: 100
          });
        }

        // 类名选择器
        if (element.className) {
          const classes = element.className.split(' ').filter(c => c.trim());
          if (classes.length > 0) {
            selectors.push({
              selector: '.' + classes.join('.'),
              strategy: 'class',
              confidence: classes.length === 1 ? 80 : 70,
              stability: 75,
              specificity: classes.length * 20
            });
          }
        }

        // 属性选择器
        const attributes = ['name', 'type', 'data-testid', 'aria-label', 'role'];
        for (const attr of attributes) {
          const value = element.getAttribute(attr);
          if (value) {
            selectors.push({
              selector: \`[\${attr}="\${value}"]\`,
              strategy: 'attribute',
              confidence: attr.startsWith('data-') ? 85 : 75,
              stability: attr.startsWith('data-') ? 85 : 70,
              specificity: 60
            });
          }
        }

        // 文本内容选择器
        const text = element.textContent?.trim();
        if (text && text.length < 50) {
          selectors.push({
            selector: \`*:contains("\${text}")\`,
            strategy: 'text',
            confidence: 60,
            stability: 40,
            specificity: 30
          });
        }

        // XPath路径
        const xpath = generateXPath(element);
        selectors.push({
          selector: xpath,
          strategy: 'xpath',
          confidence: 90,
          stability: 60,
          specificity: 80
        });

        // CSS路径
        const cssPath = generateCSSPath(element, ${depth});
        selectors.push({
          selector: cssPath,
          strategy: 'css_path',
          confidence: 85,
          stability: 65,
          specificity: 70
        });

        return selectors;

        // 辅助函数
        function generateXPath(element) {
          if (element.id) {
            return \`//*[@id="\${element.id}"]\`;
          }

          const parts = [];
          while (element && element.nodeType === Node.ELEMENT_NODE) {
            let nbOfPreviousSiblings = 0;
            const hasNextSiblings = !!element.nextElementSibling;
            let sibling = element.previousElementSibling;
            while (sibling) {
              if (sibling.nodeType !== Node.DOCUMENT_TYPE_NODE && sibling.nodeName === element.nodeName) {
                nbOfPreviousSiblings++;
              }
              sibling = sibling.previousElementSibling;
            }

            const prefix = element.prefix ? element.prefix + ':' : '';
            const nth = nbOfPreviousSiblings || hasNextSiblings ? \`[\${nbOfPreviousSiblings + 1}]\` : '';
            parts.push(prefix + element.localName + nth);
            element = element.parentElement;
          }

          return parts.length ? '/' + parts.reverse().join('/') : '';
        }

        function generateCSSPath(element, maxDepth) {
          const path = [];
          let current = element;
          let depth = 0;

          while (current && current !== document.body && depth < maxDepth) {
            let selector = current.tagName.toLowerCase();

            if (current.id) {
              selector += '#' + current.id;
              path.unshift(selector);
              break;
            }

            if (current.className) {
              const classes = current.className.split(' ').filter(c => c.trim());
              if (classes.length > 0) {
                selector += '.' + classes.join('.');
              }
            }

            // 添加nth-child如果需要
            const siblings = Array.from(current.parentElement?.children || []).filter(
              el => el.tagName === current.tagName
            );
            if (siblings.length > 1) {
              const index = siblings.indexOf(current) + 1;
              selector += \`:nth-child(\${index})\`;
            }

            path.unshift(selector);
            current = current.parentElement;
            depth++;
          }

          return path.join(' > ');
        }
      })();
    `;
        const result = await page.evaluate(script);
        return result;
    }
    /**
     * 分析选择器质量
     */
    async analyzeSelectors(selectors) {
        const page = await this.pageManager.getActivePage();
        if (!page) {
            throw new McpError(ErrorCode.InternalError, 'No active page available');
        }
        const script = `
      (() => {
        const allElements = document.querySelectorAll('*');
        const totalElements = allElements.length;
        
        // 计算DOM复杂度
        const domComplexity = Math.min(100, totalElements / 100);
        
        // 计算最大层级深度
        let maxDepth = 0;
        allElements.forEach(el => {
          let depth = 0;
          let current = el;
          while (current.parentElement) {
            depth++;
            current = current.parentElement;
          }
          maxDepth = Math.max(maxDepth, depth);
        });

        return {
          domComplexity: Math.round(domComplexity),
          elementUniqueness: Math.round((1 / totalElements) * 10000) / 100,
          hierarchyDepth: maxDepth
        };
      })();
    `;
        const result = await page.evaluate(script);
        return result;
    }
    /**
     * 选择最佳选择器
     */
    selectBestSelector(selectors) {
        if (selectors.length === 0)
            return '';
        // 计算综合分数
        const scored = selectors.map(s => ({
            ...s,
            score: (s.confidence * 0.4) + (s.stability * 0.4) + (s.specificity * 0.2)
        }));
        // 排序并返回最高分
        scored.sort((a, b) => b.score - a.score);
        return scored[0].selector;
    }
    /**
     * 选择备用选择器
     */
    selectBackupSelectors(selectors, recommended) {
        return selectors
            .filter(s => s.selector !== recommended)
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 3)
            .map(s => s.selector);
    }
    /**
     * 生成稳定性建议
     */
    generateStabilityRecommendations(changes, stability) {
        const recommendations = [];
        if (stability < 50) {
            recommendations.push('DOM稳定性较低，建议使用更稳定的选择器策略');
        }
        if (changes.structural > 5) {
            recommendations.push('检测到频繁的结构变化，避免使用基于位置的选择器');
        }
        if (changes.attribute > 10) {
            recommendations.push('属性变化频繁，建议使用ID或data-*属性');
        }
        if (changes.content > 8) {
            recommendations.push('文本内容变化较多，避免使用基于文本的选择器');
        }
        if (changes.position > 15) {
            recommendations.push('元素位置变化频繁，使用逻辑定位而非坐标定位');
        }
        if (recommendations.length === 0) {
            recommendations.push('DOM稳定性良好，可以使用多种选择器策略');
        }
        return recommendations;
    }
}
//# sourceMappingURL=ElementLocator.js.map