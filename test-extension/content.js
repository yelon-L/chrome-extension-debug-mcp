// Add a timestamp to help identify when the script runs
const timestamp = new Date().toISOString();
console.log(`[${timestamp}] Extension content script executing on ${window.location.href}`);

try {
  // Create a test element with clear visibility
  const testDiv = document.createElement('div');
  testDiv.id = 'extension-test-element';
  testDiv.textContent = `Extension Test (${timestamp})`;
  testDiv.style.cssText = `
    position: fixed;
    top: 10px;
    left: 10px;
    background: red;
    color: white;
    padding: 10px;
    z-index: 999999;
    border: 2px solid black;
    font-family: Arial, sans-serif;
    font-size: 14px;
  `;

  // Add to document and log result
  if (document.body) {
    document.body.appendChild(testDiv);
    console.log(`[${timestamp}] Test element added to page`);
  } else {
    console.error(`[${timestamp}] No document.body available`);
  }

  // Add a click handler to verify the script is working
  testDiv.addEventListener('click', () => {
    console.log(`[${timestamp}] Test element clicked`);
    testDiv.style.backgroundColor = 'green';
  });

} catch (error) {
  console.error(`[${timestamp}] Error in content script:`, error.message);
  console.error('Stack:', error.stack);
}