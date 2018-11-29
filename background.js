"use strict";
function loadLink(link) {
    chrome.tabs.create({ url: link });
}
chrome.runtime.onInstalled.addListener(() => {
    loadLink('https://getpolarized.io/download.html?utm_source=chrome_extension_on_installed&utm_medium=chrome_extension');
});
//# sourceMappingURL=background.js.map