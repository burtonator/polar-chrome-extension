
chrome.runtime.onInstalled.addListener(() => {

    chrome.storage.sync.set({number: 1}, () => {

        console.log("Installed the typescript version of the Polar extension");

        // TODO: might be nice to popup a page asking the user to download
        // Polar... or to load an about.html page ...

        console.log('The number is set to 1.');
    });

});
