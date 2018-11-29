"use strict";
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({ number: 1 }, () => {
        console.log("Installed the typescript version of the Polar extension");
        console.log('The number is set to 1.');
    });
});
//# sourceMappingURL=background.js.map