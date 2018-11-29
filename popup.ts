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

    console.log("FIXME 0 here");


    // FIXME:

    // console.log("FIXME do we have a .success: ", document.querySelectorAll(".success"));

    chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, (tabs) => {

        const link = tabs[0].url;

        console.log("current tab URL: " + link);

        sendLinkToPolar(link!)
            .then(() => {
                showSuccess();
            })
            .catch(err => {
                showError();
                console.error("Unable to send URL to polar: ", err)
            });

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
onExtensionActivated();
