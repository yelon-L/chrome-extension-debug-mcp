# Chrome Debug MCP Playwright Commands

## Browser Management

### launch_browser
```javascript
tool browser launch_browser --url "https://example.com" --browserType "chromium"
```
**Use cases:**
1. Launch automated testing sessions with specific configurations
2. Initialize browser instances for userscript testing
3. Start web scraping sessions

### create_tab
```javascript
tool browser create_tab --url "https://example.com"
```
**Use cases:**
1. Open multiple pages simultaneously
2. Manage multiple workflows in parallel
3. Compare different pages or states

### switch_tab
```javascript
tool browser switch_tab --index 1
```
**Use cases:**
1. Navigate between different open pages
2. Manage multiple concurrent tasks
3. Compare information across tabs

### list_tabs
```javascript
tool browser list_tabs
```
**Use cases:**
1. Monitor open tabs and their states
2. Debug multi-tab workflows
3. Verify tab management operations

### close_tab
```javascript
tool browser close_tab
```
**Use cases:**
1. Clean up after completing tab-specific tasks
2. Manage browser resources
3. Reset tab state for new operations

## Page Actions

### click
```javascript
tool browser click --selector "#submit-button" --button "left" --clickCount 1
```
**Use cases:**
1. Interact with page elements
2. Submit forms and trigger actions
3. Navigate through user interfaces

### type
```javascript
tool browser type --selector "#search-input" --text "search query" --delay 100
```
**Use cases:**
1. Fill form fields with text
2. Input search queries
3. Simulate user typing behavior

### navigate
```javascript
tool browser navigate --url "https://example.com" --waitUntil "networkidle"
```
**Use cases:**
1. Move between different pages
2. Start new test scenarios
3. Load specific URLs for testing

## Greasemonkey API

### gm_addStyle
```javascript
tool browser gm_addStyle --css "body { background: #f0f0f0; }"
```
**Use cases:**
1. Modify page appearance
2. Add custom styling to elements
3. Improve page readability

### gm_setValue
```javascript
tool browser gm_setValue --key "setting" --value "testValue"
```
**Use cases:**
1. Store persistent data
2. Save user preferences
3. Maintain script state

### gm_getValue
```javascript
tool browser gm_getValue --key "setting" --defaultValue "default"
```
**Use cases:**
1. Retrieve stored settings
2. Load saved preferences
3. Access persistent data

### gm_deleteValue
```javascript
tool browser gm_deleteValue --key "setting"
```
**Use cases:**
1. Clean up stored data
2. Reset settings
3. Remove outdated values

### gm_notification
```javascript
tool browser gm_notification --text "Task completed" --title "Status" --timeout 3000
```
**Use cases:**
1. Show user notifications
2. Display operation status
3. Alert about important events

### gm_setClipboard
```javascript
tool browser gm_setClipboard --text "Copied text" --info "text"
```
**Use cases:**
1. Copy data to clipboard
2. Share information between pages
3. Save extracted content

### gm_xmlhttpRequest
```javascript
tool browser gm_xmlhttpRequest --url "https://api.example.com/data" --method "GET"
```
**Use cases:**
1. Make cross-origin requests
2. Fetch external data
3. Interact with APIs

## Resource Interception

### intercept_requests
```javascript
tool browser intercept_requests --patterns ["*.jpg", "*.css"] --action "block"
```
**Use cases:**
1. Block specific resource types
2. Monitor network traffic
3. Modify network requests

### stop_intercepting
```javascript
tool browser stop_intercepting
```
**Use cases:**
1. Resume normal network behavior
2. Clean up interception rules
3. Reset network monitoring