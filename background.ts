import WebResponseHeadersDetails = chrome.webRequest.WebResponseHeadersDetails;
import WebRequestBodyDetails = chrome.webRequest.WebRequestBodyDetails;
import WebNavigationParentedCallbackDetails = chrome.webNavigation.WebNavigationParentedCallbackDetails;
import BlockingResponse = chrome.webRequest.BlockingResponse;

const HOST = 'localapp.getpolarized.io';

// We can't use multiple origins with this type of request so we have to
// see which URL we're redirecting to but in practice I think our main app URL
// is fine.
const ALLOWED_ORIGINS = `https://${HOST}`;

// Load the Polar webapp after install which will send to login if not
// authenticated first and also give the user the option to download.

const INITIAL_URL = `https://${HOST}/?utm_source=app_on_install&utm_medium=chrome_extension`;

// TODO:
//
// Algorithm for adding documents:
//
//  - documents aren't auto-saved by default

// FIXME work on detecting polar via ping to see if it's running and when it is
// see if we should 'prefer' the local desktop version and how we're going to do that
//
//  - if the user has polar as a desktop app, tell the app that it's running
//
//  - if the app is running, display an 'Add to Desktop' button
//
//  - if the app is NOT running, but logged in automatically add to polar
//
//  - Else preview and add an 'Add +' button that prompts to save and then adds the document.
//    this one can be done later though.

// for now have a floating 'add to polar' button if we are in 'preview' mode.

function getViewerURL(pdfURL: string) {

    if (pdfURL.startsWith("http://")) {
        // must use our CORS proxy which is HTTPS to view this to prevent
        // mixed content errors.
        pdfURL = CORSProxy.createProxyURL(pdfURL);
    }

    return `https://${HOST}/pdfviewer/web/index.html?file=` +
        encodeURIComponent(pdfURL) +
        '&utm_source=pdf_link&utm_medium=chrome_extension&preview=true&from=extension&zoom=page-width';

}

function loadLink(url: string) {
    chrome.tabs.create({ url });
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

/**
 * Background 'task' that sends 'ping' requests to the desktop app continually
 * to detect its state.
 */
class DesktopAppPinger {

    // TODO: instead of constantly pinging maybe we could ping when we need
    // the app.  We could have a way to just directly fetch the state.

    // the state of the desktop app, initially inactive
    private state: DesktopAppState = 'inactive';

    private static UPDATE_TIMEOUT: number = 1000;

    public start(): void {

        setTimeout(() => {

            this.update()
                .catch(err => console.error("Unable to start updating: ", err));

        }, 1);

    }

    public getState(): DesktopAppState {
        return this.state;
    }

    /**
     * Update the state by sending a ping.
     */
    private async update() {

        // TODO: there should be a better way to handle distributing state
        // information from the desktop app to the chrome extension but don't
        // want anything too complicated for now.

        try {
            await this.sendPing();
            this.state = 'active';
        } catch (e) {
            // noop as this is normal and we just have to update the state
            this.state = 'inactive';
        } finally {
            // now continually ping in the background
            setTimeout(() => this.update(), DesktopAppPinger.UPDATE_TIMEOUT);
        }

    }

    /**
     * Send a ping request to Polar to make sure it's active locally and when
     * it's not active we can't capture the URL and perform other desktop
     * tasks.
     */
    private async sendPing(): Promise<void> {

        const url = 'http://localhost:8500/rest/v1/ping';

        return new Promise<void>((resolve, reject) => {

            // For some reason the fetch API doesn't work and we have to hse XHR
            // for this functionality.

            const xrequest = new XMLHttpRequest();
            xrequest.open("GET", url);

            xrequest.onload = () => {
                resolve();
            };

            xrequest.onerror = () => {
                const {status, responseText} = xrequest;
                reject(new Error(`Request failed to: ${url} ${status}: ${responseText}`));
            };

            xrequest.send();

        });

    }


}

class CORSProxy {

    /**
     * Create a proxy URL which adds CORS headers to allow us to download it
     * from within the Polar webapp.
     *
     * @param targetURL
     */
    public static createProxyURL(targetURL: string) {

        // TODO: is it possible to make this use the CDN so we have one in
        // every datacenter?

        return "https://us-central1-polar-cors.cloudfunctions.net/cors?url=" + encodeURIComponent(targetURL);

    }

}

interface PingResponse {
    readonly timestamp: number;
    readonly version: string;
}

type DesktopAppState = 'active' | 'inactive';

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

        let responseHeaders = details.responseHeaders || [];

        if (isPDF(details)) {

            // We have to remove existing CORS headers and replace them with
            // our own or else we get two headers which isn't what we want.
            // We only care about our header.
            responseHeaders =
                responseHeaders.filter(header => header.name !== 'Access-Control-Allow-Origin');

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

const ENABLE_FILE_URLS = false;

if (ENABLE_FILE_URLS) {

    chrome.webRequest.onBeforeRequest.addListener(async (details): Promise<BlockingResponse | undefined> => {

        if (isDownloadable(details)) {
            return;
        }

        // FIXME: this has a bug where we can't determine how to open the file URL properly
        // because it can't use a CORS request with fetch for some reason.

        // background.js:120 Fetch API cannot load file:///Users/burton/Downloads/bitcoin%20(1).pdf. URL scheme "file" is not supported.

        const response = await fetch(details.url, {mode: 'no-cors'});
        const blob = await response.blob();

        const url = URL.createObjectURL(blob);
        const viewerUrl = getViewerURL(url);

        return { redirectUrl: viewerUrl, };
      },
      {
        urls: [
          'file://*/*.pdf',
          'file://*/*.PDF',
          // 'ftp://*/*.pdf',
          // 'ftp://*/*.PDF',
        ],
        types: ['main_frame', 'sub_frame'],
      },
      ['blocking']);

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

// TODO move this to a dedicated file for handling the initial page load.

chrome.runtime.onInstalled.addListener(() => {

    if (localStorage.getItem('has-downloaded') !== 'true') {
        loadLink(INITIAL_URL);
        localStorage.setItem('has-downloaded', 'true');
    } else {
        // noop
    }

});

