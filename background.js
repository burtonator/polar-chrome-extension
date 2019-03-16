"use strict";
function getViewerURL(pdfURL) {
    return 'https://app.getpolarized.io/pdfviewer/web/index.html?file=' +
        encodeURIComponent(pdfURL) +
        '&utm_source=pdf_link&utm_medium=chrome_extension';
}
function loadLink(link) {
    chrome.tabs.create({ url: link });
}
function isDownloadable(details) {
    if (details.url.includes('pdfjs.action=download') ||
        details.url.includes('polar.action=download')) {
        return true;
    }
    if (details.type) {
        details = details;
        if (details.type === 'main_frame' && !details.url.includes('=download')) {
            return false;
        }
        const contentDisposition = (details.responseHeaders &&
            HttpHeaders.hdr(details.responseHeaders, 'content-disposition'));
        return (contentDisposition && contentDisposition.value && /^attachment/i.test(contentDisposition.value));
    }
    return false;
}
function isPdfFile(details) {
    const header = HttpHeaders.hdr(details.responseHeaders, 'content-type');
    if (header && header.value) {
        const headerValue = header.value.toLowerCase().split(';', 1)[0].trim();
        if (headerValue === 'application/pdf') {
            return true;
        }
        if (headerValue === 'application/octet-stream') {
            if (details.url.toLowerCase().indexOf('.pdf') > 0) {
                return true;
            }
            const contentDisposition = HttpHeaders.hdr(details.responseHeaders, 'content-disposition');
            if (contentDisposition &&
                contentDisposition.value &&
                /\.pdf(["']|$)/i.test(contentDisposition.value)) {
                return true;
            }
        }
    }
    return false;
}
class HttpHeaders {
    static hdr(headers, headerName) {
        if (!headers) {
            return undefined;
        }
        for (const header of headers) {
            if (header.name && header.name.toLowerCase() === headerName) {
                return header;
            }
        }
        return undefined;
    }
    static createContentDispositionAttachmentHeaders(details) {
        const headers = details.responseHeaders;
        if (headers) {
            let cdHeader = this.hdr(headers, 'content-disposition');
            if (!cdHeader) {
                cdHeader = { name: 'Content-Disposition', };
                headers.push(cdHeader);
            }
            if (cdHeader && cdHeader.value && !/^attachment/i.test(cdHeader.value)) {
                cdHeader.value = 'attachment' + cdHeader.value.replace(/^[^;]+/i, '');
                return { responseHeaders: headers };
            }
        }
    }
}
chrome.webRequest.onHeadersReceived.addListener(details => {
    if (details.method !== 'GET') {
        return;
    }
    if (!isPdfFile(details)) {
        return;
    }
    if (isDownloadable(details)) {
        return HttpHeaders.createContentDispositionAttachmentHeaders(details);
    }
    const viewerUrl = getViewerURL(details.url);
    return { redirectUrl: viewerUrl, };
}, {
    urls: [
        '<all_urls>'
    ],
    types: ['main_frame', 'sub_frame'],
}, ['blocking', 'responseHeaders']);
chrome.webRequest.onBeforeRequest.addListener(details => {
    if (isDownloadable(details)) {
        return;
    }
    const viewerUrl = getViewerURL(details.url);
    return { redirectUrl: viewerUrl, };
}, {
    urls: [
        'file://*/*.pdf',
        'file://*/*.PDF',
        'ftp://*/*.pdf',
        'ftp://*/*.PDF',
    ],
    types: ['main_frame', 'sub_frame'],
}, ['blocking']);
chrome.extension.isAllowedFileSchemeAccess((isAllowedAccess) => {
    if (isAllowedAccess) {
        return;
    }
    chrome.webNavigation.onBeforeNavigate.addListener(details => {
        if (details.frameId === 0 && !isDownloadable(details)) {
            chrome.tabs.update(details.tabId, {
                url: getViewerURL(details.url),
            });
        }
    }, {
        url: [{
                urlPrefix: 'file://',
                pathSuffix: '.pdf',
            }, {
                urlPrefix: 'file://',
                pathSuffix: '.PDF',
            }],
    });
});
chrome.runtime.onInstalled.addListener(() => {
    if (localStorage.getItem('has-downloaded') !== 'true') {
        loadLink('https://getpolarized.io/download.html?utm_source=chrome_extension_on_installed&utm_medium=chrome_extension');
        localStorage.setItem('has-downloaded', 'true');
    }
    else {
    }
});
//# sourceMappingURL=background.js.map