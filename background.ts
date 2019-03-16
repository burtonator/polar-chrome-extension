import WebResponseHeadersDetails = chrome.webRequest.WebResponseHeadersDetails;
import WebRequestBodyDetails = chrome.webRequest.WebRequestBodyDetails;
import WebNavigationParentedCallbackDetails = chrome.webNavigation.WebNavigationParentedCallbackDetails;

// We can't use multiple origins with this type of request so we have to
// see which URL we're redirecting to but in practice I think our main app URL
// is fine.
const ALLOWED_ORIGINS = 'https://app.getpolarized.io';

// Load the Polar webapp after install which will send to login if not
// authenticated first and also give the user the option to download.

const INITIAL_URL = 'https://app.getpolarized.io/?utm_source=app_on_install&utm_medium=chrome_extension';

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
function isDownloadable(details: WebResponseHeadersDetails | WebNavigationParentedCallbackDetails | WebRequestBodyDetails) {

    if (details.url.includes('pdfjs.action=download') ||
        details.url.includes('polar.action=download')) {

        // allow a deep link to a URL and the site to override Polar if necessary
        // and also yield to the existing pdfjs.action download.

        return true;

    }

    if ((<any> details).type) {

        details = <WebResponseHeadersDetails> details;

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
function isPDF(details: chrome.webRequest.WebResponseHeadersDetails) {

    const contentTypeHeader = HttpHeaders.hdr(details.responseHeaders, 'content-type');

    if (contentTypeHeader && contentTypeHeader.value) {

        const headerValue = contentTypeHeader.value.toLowerCase().split(';', 1)[0].trim();

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

    /**
     * Takes a set of headers, and set "Content-Disposition: attachment".
     * @param {Object} details First argument of the webRequest.onHeadersReceived
     *                         event. The property "responseHeaders" is read and
     *                         modified if needed.
     *
     * @return {Object|undefined} The return value for the onHeadersReceived event.
     *                            Object with key "responseHeaders" if the headers
     *                            have been modified, undefined otherwise.
     */
    public static createContentDispositionAttachmentHeaders(details: WebResponseHeadersDetails): any | undefined {

        const headers = details.responseHeaders;

        if (headers) {

            let cdHeader = this.hdr(headers, 'content-disposition');

            if (!cdHeader) {
                cdHeader = { name: 'Content-Disposition', };
                headers.push(cdHeader);
            }

            if (cdHeader && cdHeader.value && !/^attachment/i.test(cdHeader.value)) {
                cdHeader.value = 'attachment' + cdHeader.value.replace(/^[^;]+/i, '');
                return { responseHeaders: headers};
            }

        }

    }

}

chrome.webRequest.onHeadersReceived.addListener(details => {

        if (details.method !== 'GET') {
            // Don't intercept POST requests until http://crbug.com/104058 is fixed.
            return;
        }

        if (!isPDF(details)) {
            return;
        }

        if (isDownloadable(details)) {
            // Force download by ensuring that Content-Disposition: attachment is set
            return HttpHeaders.createContentDispositionAttachmentHeaders(details);
        }

        const viewerUrl = getViewerURL(details.url);

        // TODO: implement this in the future.
        // saveReferer(details);

        return { redirectUrl: viewerUrl, };
    },
    {
        urls: [
            '<all_urls>'
        ],
        types: ['main_frame', 'sub_frame'],
    },
    ['blocking', 'responseHeaders']);

//
chrome.webRequest.onHeadersReceived.addListener(details => {

        const responseHeaders = details.responseHeaders || [];

        if (isPDF(details)) {
            responseHeaders.push({name: 'Access-Control-Allow-Origin', value: ALLOWED_ORIGINS});
        }

        return {responseHeaders};

    },
    {
        urls: [
            '<all_urls>'
        ]
    },
    ['blocking', 'responseHeaders']);


chrome.webRequest.onBeforeRequest.addListener(details => {

    if (isDownloadable(details)) {
        return;
    }

    const viewerUrl = getViewerURL(details.url);

    return { redirectUrl: viewerUrl, };
  },
  {
    urls: [
      'file://*/*.pdf',
      'file://*/*.PDF',
      'ftp://*/*.pdf',
      'ftp://*/*.PDF',
    ],
    types: ['main_frame', 'sub_frame'],
  },
  ['blocking']);

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

// TODO move this to a dedicated file for handling the initial page load.

chrome.runtime.onInstalled.addListener(() => {

    if (localStorage.getItem('has-downloaded') !== 'true') {
        loadLink(INITIAL_URL);
        localStorage.setItem('has-downloaded', 'true');
    } else {
        // noop
    }

});

