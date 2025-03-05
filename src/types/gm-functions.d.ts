/**
 * This file provides type definitions for the Greasemonkey/Tampermonkey-style (GM_) functions
 * that are injected into the browser context by the Chrome Debug MCP server.
 * These functions allow userscripts to interact with the browser and the web page.
 */

/**
 * Interface defining the details for a GM_xmlhttpRequest call.
 */
interface GMXMLHttpRequestDetails {
  /**
   * The URL to make the HTTP request to.
   */
  url: string;
  /**
   * A callback function to be executed when the request completes successfully.
   * The response object contains the responseText.
   */
  onload?: (response: { responseText: string }) => void;
  /**
   * A callback function to be executed when the request fails.
   * The error object contains information about the failure.
   */
  onerror?: (error: Error) => void;
}

/**
 * Augments the global Window interface to include the GM_ functions.
 */
declare global {
  interface Window {
    /**
     * Stores a value associated with the given key in the local storage.
     * The value is serialized to JSON before being stored.
     * @param key The key to store the value under.
     * @param value The value to store (can be any JSON-serializable type).
     */
    GM_setValue: (key: string, value: any) => void;
    /**
     * Retrieves a value associated with the given key from local storage.
     * If the key does not exist, returns the specified default value.
     * The value is deserialized from JSON after being retrieved.
     * @param key The key to retrieve the value for.
     * @param defaultValue The default value to return if the key is not found (optional).
     * @returns The value associated with the key, or the default value if not found.
     */
    GM_getValue: (key: string, defaultValue?: any) => any;
    /**
     * Makes an HTTP request with the given details.
     * This function allows userscripts to bypass the Same-Origin Policy.
     * @param details An object containing the details of the request, including the URL and callback functions.
     */
    GM_xmlhttpRequest: (details: GMXMLHttpRequestDetails) => void;
    /**
     * Adds custom CSS styles to the current document.
     * @param css A string containing the CSS rules to add.
     */
    GM_addStyle: (css: string) => void;
    /**
     * Opens a URL in a new tab or window.
     * @param url The URL to open.
     */
    GM_openInTab: (url: string) => void;
    /**
     * Registers a command in the userscript menu (stub implementation).
     * @param name The name of the command.
     * @param fn The function to execute when the command is selected.
     */
    GM_registerMenuCommand: (name: string, fn: () => void) => void;
    /**
     * Optional function to initialize GM functions (not used).
     */
    initGMFunctions?: () => void;
  }
}

// Export an empty object to make this a module
export {};