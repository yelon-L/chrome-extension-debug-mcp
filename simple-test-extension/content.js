// Simple content script
console.log('[Simple Extension] Content script injected on', window.location.href);

// Create a simple marker
const marker = document.createElement('div');
marker.id = 'simple-extension-marker';
marker.style.display = 'none';
marker.setAttribute('data-extension-injected', 'true');

if (document.head) {
  document.head.appendChild(marker);
} else {
  document.addEventListener('DOMContentLoaded', () => {
    document.head.appendChild(marker);
  });
}

console.log('[Simple Extension] Content script marker created');
