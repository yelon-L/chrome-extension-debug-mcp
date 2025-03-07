// Test script for Chrome Debug MCP commands
const path = require('path');
const assert = require('assert').strict;

async function runTests() {
    try {
        // 1. Launch Chrome and navigate to test page
        console.log('Launching Chrome...');
        const result = await useMcpTool('chrome-debug', 'launch_chrome', {
            url: `file://${path.resolve(__dirname, 'test.html')}`,
            disableAutomationControlled: true
        });
        console.log('Chrome launched:', result);

        // 2. Test viewport setting
        console.log('\nTesting viewport...');
        await useMcpTool('chrome-debug', 'set_viewport', {
            width: 1024,
            height: 768
        });
        console.log('Viewport set');

        // 3. Test clicking
        console.log('\nTesting click...');
        await useMcpTool('chrome-debug', 'click', {
            selector: '#test-button'
        });
        const clickResult = await useMcpTool('chrome-debug', 'get_text', {
            selector: '#click-result'
        });
        assert.equal(clickResult.content[0].text, 'Button clicked!');
        console.log('Click test passed');

        // 4. Test typing
        console.log('\nTesting type...');
        await useMcpTool('chrome-debug', 'type', {
            selector: '#test-input',
            text: 'Hello World',
            delay: 100
        });
        const typeResult = await useMcpTool('chrome-debug', 'get_text', {
            selector: '#type-result'
        });
        assert.equal(typeResult.content[0].text, 'Typed: Hello World');
        console.log('Type test passed');

        // 5. Test select
        console.log('\nTesting select...');
        await useMcpTool('chrome-debug', 'select', {
            selector: '#test-select',
            value: '2'
        });
        const selectResult = await useMcpTool('chrome-debug', 'get_text', {
            selector: '#select-result'
        });
        assert.equal(selectResult.content[0].text, 'Selected: Option 2');
        console.log('Select test passed');

        // 6. Test hover
        console.log('\nTesting hover...');
        await useMcpTool('chrome-debug', 'hover', {
            selector: '#hover-test'
        });
        const hoverResult = await useMcpTool('chrome-debug', 'get_text', {
            selector: '#hover-result'
        });
        assert.equal(hoverResult.content[0].text, 'Hovered!');
        console.log('Hover test passed');

        // 7. Test wait for selector
        console.log('\nTesting wait for selector...');
        await useMcpTool('chrome-debug', 'click', {
            selector: '#show-delayed'
        });
        await useMcpTool('chrome-debug', 'wait_for_selector', {
            selector: '#delayed-element',
            visible: true,
            timeout: 3000
        });
        console.log('Wait for selector test passed');

        // 8. Test get attribute
        console.log('\nTesting get attribute...');
        const attrResult = await useMcpTool('chrome-debug', 'get_attribute', {
            selector: '#attribute-test',
            attribute: 'data-test'
        });
        assert.equal(attrResult.content[0].text, 'test-value');
        console.log('Get attribute test passed');

        // 9. Test screenshot
        console.log('\nTesting screenshot...');
        await useMcpTool('chrome-debug', 'screenshot', {
            path: path.resolve(__dirname, 'test-screenshot.png'),
            fullPage: true
        });
        console.log('Screenshot saved');

        // 10. Test navigation
        console.log('\nTesting navigation...');
        await useMcpTool('chrome-debug', 'navigate', {
            url: 'about:blank',
            waitUntil: 'networkidle0'
        });
        console.log('Navigation test passed');

        // 11. Test evaluate
        console.log('\nTesting evaluate...');
        const evalResult = await useMcpTool('chrome-debug', 'evaluate', {
            expression: 'document.title'
        });
        assert.equal(evalResult.content[0].text, 'about:blank');
        console.log('Evaluate test passed');

        console.log('\nAll tests passed! 🎉');

    } catch (error) {
        console.error('Test failed:', error);
        process.exit(1);
    }
}

// Helper function to simulate MCP tool usage
async function useMcpTool(serverName, toolName, args) {
    // This would be replaced by actual MCP tool invocation in real usage
    console.log(`Using tool ${toolName} with args:`, args);
    // Simulated response for testing
    return { content: [{ type: 'text', text: 'Test response' }] };
}

runTests().catch(console.error);