
function loadLinkInNewTab(link: string) {
    chrome.tabs.create({url: link});
}

function queryCurrentTabForLink() {

    return new Promise<string>(resolve => {

        // FIXME: add contentType to the payload as we can get this from
        // document.contentType and for PDF it will be application/pdf which
        // will enable us to handle it properly in capture by importing it
        // not rendering it.
        //
        // It might ALSO be better to just send the raw base64 encode bytes
        // but not sure I can do that.

        chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, (tabs) => {
            const link = tabs[0].url;
            resolve(link);
        });

    });

}

function toggleVisibility(selector: string) {

    const element = <HTMLElement> document.querySelector(selector);

    if(! element) {
        return;
    }

    if(element.style.display === 'none') {
        element.style.display = 'block';
    } else {
        element.style.display = 'none';
    }

}


function showError() {

    toggleVisibility(".saving");
    toggleVisibility(".failure");

}


function showSuccess() {

    toggleVisibility(".saving");
    toggleVisibility(".success");

}

function closeWindowAfterDelay() {
    setTimeout(() => window.close(), 7500);
}

/**
 * Send a ping request to Polar to make sure it's active locally and when
 * it's not active we can't capture the URL
 */
async function sendPing(): Promise<void> {

    const url = 'http://localapp.getpolarized.io:8500/rest/v1/ping';

    return new Promise<void>((resolve, reject) => {

        // For some reason the fetch API doesn't work and we have to hse XHR
        // for this functionality.

        const xrequest = new XMLHttpRequest();
        xrequest.open("GET", url);

        xrequest.onload = () => {
            resolve();
        };

        xrequest.onerror = () => {
            reject("Request failed to: " + url);
        };

        xrequest.send();

    });

}

async function sendLinkToPolar(link: string): Promise<void> {

    console.log("Sending link to polar: " + link);

    const url = 'http://localapp.getpolarized.io:8500/rest/v1/capture/trigger';

    const data: any = {
        link
    };

    return new Promise<void>((resolve, reject) => {

        // For some reason the fetch API doesn't work and we have to hse XHR
        // for this functionality.

        const xrequest = new XMLHttpRequest();
        xrequest.open("POST", url);

        xrequest.onload = () => {
            resolve();
        };

        xrequest.onerror = () => {
            reject("Request failed to: " + url);
        };

        xrequest.setRequestHeader("Content-Type", "application/json; charset=utf-8");
        xrequest.send(JSON.stringify(data));

    });

    // await fetch(url, {
    //     method: "POST",
    //     cache: "no-store",
    //     // mode: 'no-cors',
    //     headers: {
    //         "Content-Type": "application/json; charset=utf-8",
    //     },
    //     body: JSON.stringify(data),
    // });

}

/**
 * Called when the user clicks the button in the page to 'share' with Polar.
 */
async function onExtensionActivated() {

    const link = await queryCurrentTabForLink();

    await sendLinkToPolar(link!);

    showSuccess();
    closeWindowAfterDelay();
    console.log("success");

}

function setupLinkHandlers() {

    document.querySelector("#download-link")!.addEventListener('click', () => {
        loadLinkInNewTab('https://getpolarized.io/download.html?utm_source=chrome_extension_failed&utm_medium=chrome_extension');
    });

}

document.addEventListener("DOMContentLoaded", () => {

    setupLinkHandlers();

    onExtensionActivated()
        .catch(err => {
            console.log("failed");
            showError();
            closeWindowAfterDelay();
            console.error("Unable to send URL to polar: ", err)
        });

});
