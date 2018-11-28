// Copyright (c) 2011 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

chrome.runtime.onInstalled.addListener(function() {
    chrome.storage.sync.set({number: 1}, function() {

        // TODO: might be nice to popup a page asking the user to download
        // Polar... or to load an about.html page ...

        console.log('The number is set to 1.');
    });
});

function updateIcon() {

    chrome.tabs.query({'active': true, 'lastFocusedWindow': true}, (tabs) => {
        var url = tabs[0].url;

        console.log("current tab URL: " + url);

    });

    chrome.storage.sync.get('number', function(data) {

        var current = data.number;

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

        chrome.storage.sync.set({number: current}, function() {
            console.log('The number is set to ' + current);
        });

    });

};

chrome.browserAction.onClicked.addListener(updateIcon);
updateIcon();
