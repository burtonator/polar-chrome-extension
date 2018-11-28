"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.set({ number: 1 }, () => {
        console.log("Installed the typescript version of the Polar extension");
        console.log('The number is set to 1.');
    });
});
function sendLinkToPolar(link) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("Sending link to polar: " + link);
        const url = 'http://localapp.getpolarized.io/rest/v1/trigger-capture';
        const data = {
            link
        };
        yield fetch(url, {
            method: "POST",
            cache: "no-cache",
            headers: {
                "Content-Type": "application/json; charset=utf-8",
            },
            body: JSON.stringify(data),
        });
    });
}
function onExtensionActivated() {
    chrome.tabs.query({ 'active': true, 'lastFocusedWindow': true }, (tabs) => {
        const link = tabs[0].url;
        console.log("current tab URL: " + link);
        sendLinkToPolar(link)
            .catch(err => console.error("Unable to send URL to polar: ", err));
    });
    chrome.storage.sync.get('number', (data) => {
        let current = data.number;
        if (current === undefined) {
            current = 1;
        }
        chrome.browserAction.setIcon({ path: 'icon-polar-active.png' });
        current++;
        if (current > 5)
            current = 1;
        chrome.storage.sync.set({ number: current }, () => {
            console.log('The number is set to ' + current);
        });
    });
}
chrome.browserAction.onClicked.addListener(onExtensionActivated);
onExtensionActivated();
//# sourceMappingURL=background.js.map