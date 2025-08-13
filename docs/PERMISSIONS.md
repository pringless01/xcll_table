# Permissions rationale

This extension needs:

- storage: save user settings (selection mode, UI prefs).
- scripting/activeTab/tabs: inject and control content scripts on the current page when the user activates the extension.
- clipboardRead/clipboardWrite: copy selected table data to clipboard and handle paste if implemented.
- host_permissions <all_urls>: feature works on arbitrary sites with tables. Narrow this if your target is known (e.g. https://example.com/*).

Also, `libs/xlsx.full.min.js` is lazy-loaded at runtime via `chrome.runtime.getURL` and referenced via `web_accessible_resources`.
