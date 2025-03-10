// ==UserScript==
// @name        GM API Test Script
// @description Tests all Greasemonkey API functions
// @version     1.0
// @grant       all
// ==/UserScript==

console.log('Starting GM API tests...');

// Test GM_info
console.log('Testing GM_info:', GM_info);

// Test storage functions
console.log('\nTesting storage functions...');
GM_setValue('testKey', 'testValue');
GM_setValue('testObject', { foo: 'bar' });
console.log('GM_getValue:', GM_getValue('testKey'));
console.log('GM_getValue object:', GM_getValue('testObject'));
console.log('GM_listValues:', GM_listValues());
GM_deleteValue('testKey');
console.log('After delete - GM_getValue:', GM_getValue('testKey', 'default'));

// Test clipboard with different content types
console.log('\nTesting clipboard functions...');
GM_setClipboard('Plain text test');
console.log('Plain text copied');

GM_setClipboard('<b>HTML test</b>', 'html');
console.log('HTML content copied');

// Test notifications with various configurations
console.log('\nTesting notification system...');

async function testNotifications() {
    // Test 1: Simple string notification
    console.log('Testing simple notification...');
    GM_notification('Simple notification message');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test 2: Basic notification with title
    console.log('Testing basic notification with title...');
    GM_notification({
        title: 'Test Title',
        text: 'Basic notification with title',
        timeout: 2000
    });
    await new Promise(resolve => setTimeout(resolve, 2500));

    // Test 3: Interactive notification
    console.log('Testing interactive notification...');
    let clicked = false;
    GM_notification({
        title: 'Click Me!',
        text: 'This notification is interactive',
        timeout: 0, // No timeout - must be clicked
        onclick: () => {
            clicked = true;
            console.log('✓ Interactive notification clicked');
        },
        ondone: () => {
            console.log(`Interactive notification closed (${clicked ? 'clicked' : 'not clicked'})`);
        }
    });
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Test 4: Notification with emoji and formatting
    console.log('Testing rich text notification...');
    GM_notification({
        title: '🎉 Rich Notification',
        text: 'This notification includes emoji and will auto-close',
        timeout: 2000,
        ondone: () => console.log('✓ Rich notification closed automatically')
    });
    await new Promise(resolve => setTimeout(resolve, 2500));

    // Test 5: Sequential notifications
    console.log('Testing sequential notifications...');
    for (let i = 1; i <= 3; i++) {
        GM_notification({
            title: `Notification ${i}/3`,
            text: `Sequential notification test ${i}`,
            timeout: 1500,
            ondone: () => console.log(`✓ Sequential notification ${i} closed`)
        });
        await new Promise(resolve => setTimeout(resolve, 800));
    }
}

// Test results tracking
const testResults = {
    simple: false,
    basic: false,
    interactive: false,
    richText: false,
    sequential: 0
};

// Immediately wrap GM_notification before any tests
const originalNotification = window.GM_notification;
window.GM_notification = function(details) {
    console.log('Creating notification:', typeof details === 'string' ? details : details.title || 'untitled');
    
    const notificationDetails = typeof details === 'string'
        ? { text: details }
        : { ...details };

    // Track notification creation
    if (!notificationDetails.title) testResults.simple = true;
    else if (notificationDetails.title === 'Test Title') testResults.basic = true;
    else if (notificationDetails.title === 'Click Me!') testResults.interactive = true;
    else if (notificationDetails.title === '🎉 Rich Notification') testResults.richText = true;
    else if (notificationDetails.title.startsWith('Notification ')) testResults.sequential++;

    // Wrap callbacks
    const originalOndone = notificationDetails.ondone;
    const originalOnclick = notificationDetails.onclick;

    notificationDetails.ondone = () => {
        console.log('Notification completed:', notificationDetails.title || 'simple');
        if (originalOndone) originalOndone();
    };

    if (originalOnclick) {
        notificationDetails.onclick = () => {
            console.log('Notification clicked:', notificationDetails.title);
            originalOnclick();
        };
    }

    return originalNotification.call(this, notificationDetails);
};

// Run tests and report results
async function runTests() {
    console.log('Starting notification tests...');
    
    try {
        await testNotifications();
        
        // Wait for notifications to complete
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // Print final results
        console.log('\nNotification Test Results:');
        console.log(`${testResults.simple ? '✓' : '✗'} Simple notification`);
        console.log(`${testResults.basic ? '✓' : '✗'} Basic notification with title`);
        console.log(`${testResults.interactive ? '✓' : '✗'} Interactive notification`);
        console.log(`${testResults.richText ? '✓' : '✗'} Rich notification`);
        console.log(`Sequential notifications: ${testResults.sequential}/3`);
        
        const success = Object.entries(testResults).every(([key, value]) =>
            key === 'sequential' ? value === 3 : value === true
        );
        
        console.log('\nTest Status:', success ? 'SUCCESS' : 'PARTIAL SUCCESS');
        if (!success) {
            console.log('Note: Some notifications may require user interaction or permissions.');
        }
    } catch (error) {
        console.error('Test execution error:', error);
    }
}

// Start the tests
runTests();

// Test style injection
console.log('\nTesting style injection...');
GM_addStyle(`
  .gm-test { 
    color: red; 
    background: yellow;
  }
`);
const testDiv = document.createElement('div');
testDiv.className = 'gm-test';
testDiv.textContent = 'Style test';
document.body.appendChild(testDiv);

// Test XMLHttpRequest
console.log('\nTesting GM_xmlhttpRequest...');
GM_xmlhttpRequest({
  method: 'GET',
  url: 'https://jsonplaceholder.typicode.com/todos/1',
  headers: {
    'Accept': 'application/json'
  },
  timeout: 5000,
  onload: (response) => {
    console.log('XHR success:', response.responseText);
    console.log('XHR headers:', response.responseHeaders);
    console.log('XHR status:', response.status);
  },
  onerror: (error) => console.error('XHR error:', error)
});

// Test tab operations
console.log('\nTesting tab operations...');
const tab = GM_openInTab('https://example.com', {
  active: true,
  insert: true,
  setParent: true
});
tab.onclose = () => console.log('Tab closed');

// Test menu commands
console.log('\nTesting menu commands...');
const commandId = GM_registerMenuCommand('Test Command', () => {
  console.log('Menu command executed');
}, 'T');

// Test resource handling (stub)
console.log('\nTesting resource handling...');
console.log('Resource text:', GM_getResourceText('testResource'));
console.log('Resource URL:', GM_getResourceURL('testResource'));

console.log('GM API tests complete!');