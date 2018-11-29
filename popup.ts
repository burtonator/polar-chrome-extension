console.log("this is the script: ", chrome);

console.log("document.location.href: " + document.location!.href);


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

async function sendLinkToPolar(link: string): Promise<void> {

    console.log("Sending link to polar: " + link);

    const url = 'http://localapp.getpolarized.io:8500/rest/v1/capture/trigger';

    const data: any = {
        link
    };

    return new Promise<void>((resolve, reject) => {

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

function loadLinkInTag(link: string) {
    chrome.tabs.create({url: link});
}

async function queryLinkForCurrentTab() {

    return new Promise<string>(resolve => {

        chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, (tabs) => {
            const link = tabs[0].url;
            resolve(link);
        });

    });

}

/**
 * Called when the user clicks the button in the page to 'share' with Polar.
 */
async function onExtensionActivated() {

    const link = await queryLinkForCurrentTab();

    await sendLinkToPolar(link!);

    showSuccess();
    closeWindowAfterDelay();
    console.log("success");

}

function setupLinkHandlers() {

    document.querySelector("#download-link")!.addEventListener('click', () => {
        loadLinkInTag('https://getpolarized.io/download.html?utm_source=chrome_extension_failed&utm_medium=chrome_extension')
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
