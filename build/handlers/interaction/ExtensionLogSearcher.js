/**
 * 扩展日志搜索增强模块
 * Phase 4: 交互与快照增强 - 日志分析功能
 */
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
const log = (...args) => console.error('[ExtensionLogSearcher]', ...args);
export class ExtensionLogSearcher {
    chromeManager;
    constructor(chromeManager) {
        this.chromeManager = chromeManager;
    }
    /**
     * 搜索扩展日志
     */
    async searchLogs(options) {
        const startTime = Date.now();
        try {
            log('Starting log search', options);
            // 验证搜索参数
            this.validateSearchOptions(options);
            // 收集日志数据
            const allLogs = await this.collectLogs(options);
            log(`Collected ${allLogs.length} logs for search`);
            // 执行搜索
            const matches = await this.performSearch(allLogs, options);
            log(`Found ${matches.length} matches`);
            // 计算统计信息
            const statistics = this.calculateStatistics(matches, allLogs);
            // 计算性能指标
            const searchTimeMs = Date.now() - startTime;
            const performance = {
                searchTimeMs,
                logsScanned: allLogs.length,
                matchRate: allLogs.length > 0 ? (matches.length / allLogs.length) * 100 : 0
            };
            return {
                matches,
                totalMatches: matches.length,
                searchOptions: options,
                statistics,
                performance
            };
        }
        catch (error) {
            log('Log search failed:', error);
            throw new McpError(ErrorCode.InternalError, `Log search failed: ${error.message}`);
        }
    }
    /**
     * 导出扩展日志
     */
    async exportLogs(options) {
        try {
            log('Starting log export', options);
            // 收集日志数据
            const allLogs = await this.collectLogsForExport(options);
            log(`Collected ${allLogs.length} logs for export`);
            // 根据格式导出
            const data = await this.formatLogs(allLogs, options);
            // 计算时间范围
            const timeRange = this.calculateTimeRange(allLogs);
            return {
                data,
                format: options.format,
                totalLogs: allLogs.length,
                exportedLogs: allLogs.length,
                metadata: {
                    exportTime: Date.now(),
                    timeRange,
                    filters: options
                }
            };
        }
        catch (error) {
            log('Log export failed:', error);
            throw new McpError(ErrorCode.InternalError, `Log export failed: ${error.message}`);
        }
    }
    /**
     * 分析日志模式
     */
    async analyzeLogPatterns(options) {
        try {
            log('Starting log pattern analysis', options);
            // 收集日志数据
            const searchOptions = {
                query: '.*',
                useRegex: true,
                extensionId: options.extensionId,
                since: options.timeRange?.start,
                until: options.timeRange?.end
            };
            const allLogs = await this.collectLogs(searchOptions);
            log(`Analyzing patterns in ${allLogs.length} logs`);
            // 提取日志模式
            const patterns = this.extractPatterns(allLogs, options.minFrequency || 2);
            // 计算统计信息
            const statistics = {
                totalLogs: allLogs.length,
                uniquePatterns: patterns.length,
                mostCommonPattern: patterns[0]?.pattern || '',
                errorRate: this.calculateLevelRate(allLogs, 'error'),
                warningRate: this.calculateLevelRate(allLogs, 'warning')
            };
            // 生成时间线数据
            const timeline = this.generateTimeline(allLogs);
            return {
                patterns,
                statistics,
                timeline
            };
        }
        catch (error) {
            log('Log pattern analysis failed:', error);
            throw new McpError(ErrorCode.InternalError, `Log pattern analysis failed: ${error.message}`);
        }
    }
    /**
     * 验证搜索选项
     */
    validateSearchOptions(options) {
        if (!options.query || options.query.trim() === '') {
            throw new McpError(ErrorCode.InvalidParams, 'Search query is required');
        }
        if (options.useRegex) {
            try {
                new RegExp(options.query);
            }
            catch (error) {
                throw new McpError(ErrorCode.InvalidParams, `Invalid regex pattern: ${options.query}`);
            }
        }
        if (options.limit && options.limit < 1) {
            throw new McpError(ErrorCode.InvalidParams, 'Limit must be greater than 0');
        }
    }
    /**
     * 收集日志数据
     */
    async collectLogs(options) {
        const cdpClient = this.chromeManager.getCdpClient();
        if (!cdpClient) {
            throw new McpError(ErrorCode.InternalError, 'Chrome not connected');
        }
        // 获取控制台日志
        const consoleLogs = await this.getConsoleLogs();
        // 过滤日志
        let filteredLogs = consoleLogs;
        // 按扩展ID过滤
        if (options.extensionId) {
            filteredLogs = filteredLogs.filter(log => this.isLogFromExtension(log, options.extensionId));
        }
        else if (options.extensionIds && options.extensionIds.length > 0) {
            filteredLogs = filteredLogs.filter(log => options.extensionIds.some(id => this.isLogFromExtension(log, id)));
        }
        // 按级别过滤
        if (options.level && options.level.length > 0) {
            filteredLogs = filteredLogs.filter(log => options.level.includes(log.level));
        }
        // 按来源类型过滤
        if (options.sourceTypes && options.sourceTypes.length > 0) {
            filteredLogs = filteredLogs.filter(log => options.sourceTypes.includes(log.source || 'unknown'));
        }
        // 按时间范围过滤
        if (options.since) {
            filteredLogs = filteredLogs.filter(log => log.timestamp >= options.since);
        }
        if (options.until) {
            filteredLogs = filteredLogs.filter(log => log.timestamp <= options.until);
        }
        return filteredLogs;
    }
    /**
     * 收集日志用于导出
     */
    async collectLogsForExport(options) {
        const searchOptions = {
            query: '.*',
            useRegex: true,
            extensionId: options.extensionId,
            extensionIds: options.extensionIds,
            level: options.level,
            sourceTypes: options.sourceTypes,
            since: options.since,
            until: options.until
        };
        return await this.collectLogs(searchOptions);
    }
    /**
     * 执行搜索
     */
    async performSearch(logs, options) {
        const matches = [];
        const regex = options.useRegex ?
            new RegExp(options.query, options.caseSensitive ? 'g' : 'gi') :
            null;
        for (const log of logs) {
            const matchDetails = [];
            // 搜索消息内容
            if (this.searchInText(log.message, options.query, regex, options.caseSensitive)) {
                const details = this.getMatchDetails(log.message, options.query, regex, options.caseSensitive, 'message');
                matchDetails.push(...details);
            }
            // 搜索来源信息
            if (log.source && this.searchInText(log.source, options.query, regex, options.caseSensitive)) {
                const details = this.getMatchDetails(log.source, options.query, regex, options.caseSensitive, 'source');
                matchDetails.push(...details);
            }
            // 搜索URL信息
            if (log.url && this.searchInText(log.url, options.query, regex, options.caseSensitive)) {
                const details = this.getMatchDetails(log.url, options.query, regex, options.caseSensitive, 'url');
                matchDetails.push(...details);
            }
            if (matchDetails.length > 0) {
                matches.push({
                    logEntry: log,
                    matchDetails,
                    relevanceScore: this.calculateRelevanceScore(matchDetails, options.query)
                });
            }
        }
        // 按相关性排序
        matches.sort((a, b) => b.relevanceScore - a.relevanceScore);
        // 应用限制
        if (options.limit && matches.length > options.limit) {
            return matches.slice(0, options.limit);
        }
        return matches;
    }
    /**
     * 搜索文本中的内容
     */
    searchInText(text, query, regex, caseSensitive) {
        if (regex) {
            return regex.test(text);
        }
        else {
            const searchText = caseSensitive ? text : text.toLowerCase();
            const searchQuery = caseSensitive ? query : query.toLowerCase();
            return searchText.includes(searchQuery);
        }
    }
    /**
     * 获取匹配详情
     */
    getMatchDetails(text, query, regex, caseSensitive, field) {
        const details = [];
        if (regex) {
            let match;
            const globalRegex = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
            while ((match = globalRegex.exec(text)) !== null) {
                details.push({
                    field,
                    matchText: match[0],
                    position: match.index,
                    length: match[0].length,
                    contextBefore: text.substring(Math.max(0, match.index - 20), match.index),
                    contextAfter: text.substring(match.index + match[0].length, match.index + match[0].length + 20)
                });
            }
        }
        else {
            const searchText = caseSensitive ? text : text.toLowerCase();
            const searchQuery = caseSensitive ? query : query.toLowerCase();
            let startIndex = 0;
            let position = searchText.indexOf(searchQuery, startIndex);
            while (position !== -1) {
                details.push({
                    field,
                    matchText: text.substring(position, position + query.length),
                    position,
                    length: query.length,
                    contextBefore: text.substring(Math.max(0, position - 20), position),
                    contextAfter: text.substring(position + query.length, position + query.length + 20)
                });
                startIndex = position + 1;
                position = searchText.indexOf(searchQuery, startIndex);
            }
        }
        return details;
    }
    /**
     * 计算相关性分数
     */
    calculateRelevanceScore(matchDetails, query) {
        let score = 0;
        for (const detail of matchDetails) {
            // 基础分数
            score += 10;
            // 字段权重
            switch (detail.field) {
                case 'message':
                    score += 20;
                    break;
                case 'source':
                    score += 10;
                    break;
                case 'url':
                    score += 5;
                    break;
            }
            // 匹配长度权重
            score += detail.length * 0.5;
            // 完整单词匹配奖励
            if (detail.matchText.toLowerCase() === query.toLowerCase()) {
                score += 15;
            }
        }
        return Math.round(score);
    }
    /**
     * 获取控制台日志
     */
    async getConsoleLogs() {
        // 这里应该调用现有的日志收集逻辑
        // 为了简化，我们先返回空数组，实际实现时应该集成现有的日志系统
        return [];
    }
    /**
     * 检查日志是否来自指定扩展
     */
    isLogFromExtension(log, extensionId) {
        // 检查URL中是否包含扩展ID
        if (log.url && log.url.includes(`chrome-extension://${extensionId}`)) {
            return true;
        }
        // 检查来源信息
        if (log.source && log.source.includes(extensionId)) {
            return true;
        }
        // 检查消息内容
        if (log.message && log.message.includes(extensionId)) {
            return true;
        }
        return false;
    }
    /**
     * 计算统计信息
     */
    calculateStatistics(matches, allLogs) {
        const matchesByLevel = {};
        const matchesBySource = {};
        const matchesByExtension = {};
        let earliest = Number.MAX_SAFE_INTEGER;
        let latest = 0;
        for (const match of matches) {
            const log = match.logEntry;
            // 按级别统计
            matchesByLevel[log.level] = (matchesByLevel[log.level] || 0) + 1;
            // 按来源统计
            const sourceType = log.source || 'unknown';
            matchesBySource[sourceType] = (matchesBySource[sourceType] || 0) + 1;
            // 按扩展统计（从URL提取扩展ID）
            if (log.url && log.url.includes('chrome-extension://')) {
                const match = log.url.match(/chrome-extension:\/\/([a-z]+)/);
                if (match) {
                    const extensionId = match[1];
                    matchesByExtension[extensionId] = (matchesByExtension[extensionId] || 0) + 1;
                }
            }
            // 时间范围
            if (log.timestamp < earliest)
                earliest = log.timestamp;
            if (log.timestamp > latest)
                latest = log.timestamp;
        }
        return {
            matchesByLevel,
            matchesBySource,
            matchesByExtension,
            timeRange: {
                earliest: earliest === Number.MAX_SAFE_INTEGER ? 0 : earliest,
                latest
            }
        };
    }
    /**
     * 格式化日志用于导出
     */
    async formatLogs(logs, options) {
        switch (options.format) {
            case 'json':
                return JSON.stringify(logs, null, 2);
            case 'csv':
                return this.formatAsCSV(logs, options.includeMetadata);
            case 'txt':
                return this.formatAsText(logs, options.includeMetadata);
            default:
                throw new McpError(ErrorCode.InvalidParams, `Unsupported export format: ${options.format}`);
        }
    }
    /**
     * 格式化为CSV
     */
    formatAsCSV(logs, includeMetadata) {
        const headers = ['timestamp', 'level', 'message', 'source', 'url'];
        if (includeMetadata) {
            headers.push('sourceType', 'extensionId');
        }
        const rows = [headers.join(',')];
        for (const log of logs) {
            const row = [
                new Date(log.timestamp).toISOString(),
                log.level,
                `"${log.message.replace(/"/g, '""')}"`,
                `"${(log.source || '').replace(/"/g, '""')}"`,
                `"${(log.url || '').replace(/"/g, '""')}"`
            ];
            if (includeMetadata) {
                row.push(log.source || '');
                // 尝试从URL提取扩展ID
                const extensionMatch = log.url?.match(/chrome-extension:\/\/([a-z]+)/);
                row.push(extensionMatch ? extensionMatch[1] : '');
            }
            rows.push(row.join(','));
        }
        return rows.join('\n');
    }
    /**
     * 格式化为文本
     */
    formatAsText(logs, includeMetadata) {
        const lines = [];
        for (const log of logs) {
            const timestamp = new Date(log.timestamp).toISOString();
            let line = `[${timestamp}] [${log.level.toUpperCase()}] ${log.message}`;
            if (log.source) {
                line += ` (Source: ${log.source})`;
            }
            if (log.url) {
                line += ` (URL: ${log.url})`;
            }
            if (includeMetadata && log.source) {
                line += ` (Type: ${log.source})`;
            }
            lines.push(line);
        }
        return lines.join('\n');
    }
    /**
     * 计算时间范围
     */
    calculateTimeRange(logs) {
        if (logs.length === 0) {
            return { earliest: 0, latest: 0 };
        }
        let earliest = logs[0].timestamp;
        let latest = logs[0].timestamp;
        for (const log of logs) {
            if (log.timestamp < earliest)
                earliest = log.timestamp;
            if (log.timestamp > latest)
                latest = log.timestamp;
        }
        return { earliest, latest };
    }
    /**
     * 提取日志模式
     */
    extractPatterns(logs, minFrequency) {
        const patternMap = new Map();
        for (const log of logs) {
            // 简化消息内容，提取模式
            const pattern = this.extractPattern(log.message);
            if (patternMap.has(pattern)) {
                const existing = patternMap.get(pattern);
                existing.count++;
                existing.lastSeen = Math.max(existing.lastSeen, log.timestamp);
                if (existing.examples.length < 3) {
                    existing.examples.push(log.message);
                }
            }
            else {
                patternMap.set(pattern, {
                    count: 1,
                    level: log.level,
                    examples: [log.message],
                    firstSeen: log.timestamp,
                    lastSeen: log.timestamp
                });
            }
        }
        // 转换为结果格式并过滤
        const patterns = [];
        const totalLogs = logs.length;
        for (const [pattern, data] of patternMap.entries()) {
            if (data.count >= minFrequency) {
                patterns.push({
                    pattern,
                    frequency: data.count,
                    percentage: (data.count / totalLogs) * 100,
                    level: data.level,
                    examples: data.examples,
                    firstSeen: data.firstSeen,
                    lastSeen: data.lastSeen
                });
            }
        }
        // 按频率排序
        patterns.sort((a, b) => b.frequency - a.frequency);
        return patterns;
    }
    /**
     * 从日志消息中提取模式
     */
    extractPattern(message) {
        // 移除时间戳
        let pattern = message.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g, '[TIMESTAMP]');
        // 移除数字
        pattern = pattern.replace(/\b\d+(\.\d+)?\b/g, '[NUMBER]');
        // 移除URL
        pattern = pattern.replace(/https?:\/\/[^\s]+/g, '[URL]');
        // 移除扩展ID
        pattern = pattern.replace(/[a-z]{32}/g, '[EXTENSION_ID]');
        // 移除特殊字符，保持基本结构
        pattern = pattern.replace(/['"]/g, '');
        return pattern.trim();
    }
    /**
     * 计算级别比率
     */
    calculateLevelRate(logs, level) {
        if (logs.length === 0)
            return 0;
        const levelCount = logs.filter(log => log.level === level).length;
        return (levelCount / logs.length) * 100;
    }
    /**
     * 生成时间线数据
     */
    generateTimeline(logs) {
        if (logs.length === 0) {
            return { interval: '1h', data: [] };
        }
        // 按小时分组
        const hourlyData = new Map();
        for (const log of logs) {
            const hour = Math.floor(log.timestamp / (1000 * 60 * 60)) * (1000 * 60 * 60);
            if (!hourlyData.has(hour)) {
                hourlyData.set(hour, { count: 0, errorCount: 0, warningCount: 0 });
            }
            const data = hourlyData.get(hour);
            data.count++;
            if (log.level === 'error')
                data.errorCount++;
            if (log.level === 'warning')
                data.warningCount++;
        }
        const timelineData = Array.from(hourlyData.entries()).map(([timestamp, data]) => ({
            timestamp,
            count: data.count,
            errorCount: data.errorCount,
            warningCount: data.warningCount
        }));
        // 按时间排序
        timelineData.sort((a, b) => a.timestamp - b.timestamp);
        return {
            interval: '1h',
            data: timelineData
        };
    }
}
//# sourceMappingURL=ExtensionLogSearcher.js.map