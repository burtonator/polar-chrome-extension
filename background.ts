
function loadLink(link: string) {
    chrome.tabs.create({ url: link });
}

chrome.runtime.onInstalled.addListener(() => {

    loadLink('https://getpolarized.io/download.html?utm_source=chrome_extension_on_installed&utm_medium=chrome_extension');

});

