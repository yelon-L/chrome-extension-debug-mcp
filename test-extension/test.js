// Create a clearly visible element
const testDiv = document.createElement('div');
testDiv.style.cssText = `
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  background: red;
  color: white;
  font-size: 20px;
  padding: 10px;
  text-align: center;
  z-index: 999999;
`;
testDiv.textContent = 'Test Extension Active! Time: ' + new Date().toISOString();

// Add it to the page
document.body.appendChild(testDiv);

// Log that we ran
console.log('Test extension content script executed at ' + new Date().toISOString());