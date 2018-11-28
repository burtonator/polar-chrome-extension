
chrome.runtime.onInstalled.addListener(() => {

    chrome.storage.sync.set({number: 1}, () => {

        console.log("Installed the typescript version of the Polar extension");

        // TODO: might be nice to popup a page asking the user to download
        // Polar... or to load an about.html page ...

        console.log('The number is set to 1.');
    });

});

async function sendLinkToPolar(link: string) {

    console.log("Sending link to polar: " + link);

    const url = 'http://localapp.getpolarized.io/rest/v1/trigger-capture';

    const data: any = {
        link
    };

    await fetch(url, {
        method: "POST",
        cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
        headers: {
            "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify(data), // body data type must match "Content-Type" header
    });

}

/**
 * Called when the user clicks the button in the page to 'share' with Polar.
 */
function onExtensionActivated() {

    chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, (tabs) => {

        const link = tabs[0].url;

        console.log("current tab URL: " + link);

        sendLinkToPolar(link!)
            .catch(err => console.error("Unable to send URL to polar: ", err));

    });

    chrome.storage.sync.get('number', (data) => {

        let current = data.number;

        if (current === undefined) {
            current = 1;
        }

        // FIXME: use a better URL to note that the URL is captured properly
        // in polar.

        // chrome.browserAction.setIcon({path: 'icon' + current + '.png'});
        chrome.browserAction.setIcon({path: 'icon-polar-active.png'});

        current++;

        if (current > 5)
            current = 1;

        chrome.storage.sync.set({number: current}, () => {
            console.log('The number is set to ' + current);
        });

    });

}

chrome.browserAction.onClicked.addListener(onExtensionActivated);
onExtensionActivated();


