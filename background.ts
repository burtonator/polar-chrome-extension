
function getViewerURL(pdfURL: string) {

    return 'https://app.getpolarized.io/pdfviewer/web/index.html?file=' +
        encodeURIComponent(pdfURL) +
        '&utm_source=pdf_link&utm_medium=chrome_extension';

}

function loadLink(link: string) {
    chrome.tabs.create({ url: link });
}

/**
 * Return true if we can download the PDF by looking at the content disposition headers,
 * the URL, etc.
 *
 */
function isDownloadable(details: chrome.webRequest.WebResponseHeadersDetails | chrome.webNavigation.WebNavigationParentedCallbackDetails) {

    if (details.url.includes('pdfjs.action=download') ||
        details.url.includes('polar.action=download')) {

        // allow a deep link to a URL and the site to override Polar if necessary
        // and also yield to the existing pdfjs.action download.

        return true;

    }

    if ((<any> details).type) {

        details = <chrome.webRequest.WebResponseHeadersDetails> details;

        // Display the PDF viewer regardless of the Content-Disposition header if the
        // file is displayed in the main frame, since most often users want to view
        // a PDF, and servers are often misconfigured.
        // If the query string contains "=download", do not unconditionally force the
        // viewer to open the PDF, but first check whether the Content-Disposition
        // header specifies an attachment. This allows sites like Google Drive to
        // operate correctly (#6106).
        if (details.type === 'main_frame' && !details.url.includes('=download')) {
            return false;
        }

        const contentDisposition = (details.responseHeaders &&
            HttpHeaders.hdr(details.responseHeaders, 'content-disposition'))
        ;

        return (contentDisposition && contentDisposition.value && /^attachment/i.test(contentDisposition.value));
    }

    return false;

}

/**
 * Return true if this is a PDF file.
 */
function isPdfFile(details: chrome.webRequest.WebResponseHeadersDetails) {

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

            const contentDisposition =
                HttpHeaders.hdr(details.responseHeaders, 'content-disposition');

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

    /**
     * Get an individual header.
     */
    public static hdr(headers: chrome.webRequest.HttpHeader[] | undefined,
                      headerName: string): chrome.webRequest.HttpHeader | undefined {

        if (! headers) {
            return undefined;
        }

        for (const header of headers) {

            if (header.name && header.name.toLowerCase() === headerName) {
                return header;
            }

        }

        return undefined;

    }

}

chrome.extension.isAllowedFileSchemeAccess((isAllowedAccess) => {

    if (isAllowedAccess) {
        return;
    }

    chrome.webNavigation.onBeforeNavigate.addListener(details => {

        if (details.frameId === 0 && ! isDownloadable(details)) {
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

// TODO move this to a dedicated file.

chrome.runtime.onInstalled.addListener(() => {

    if (localStorage.getItem('has-downloaded') !== 'true') {
        loadLink('https://getpolarized.io/download.html?utm_source=chrome_extension_on_installed&utm_medium=chrome_extension');
        localStorage.setItem('has-downloaded', 'true');
    } else {
        // noop
    }

});