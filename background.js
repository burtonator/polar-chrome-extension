"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const ALLOWED_ORIGINS = 'https://app.getpolarized.io';
const INITIAL_URL = 'https://app.getpolarized.io/?utm_source=app_on_install&utm_medium=chrome_extension';
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
function isPDF(details) {
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
class DesktopAppPinger {
    constructor() {
        this.state = 'inactive';
    }
    start() {
        setTimeout(() => {
            this.update()
                .catch(err => console.error("Unable to start updating: ", err));
        }, 1);
    }
    getState() {
        return this.state;
    }
    update() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.sendPing();
                this.state = 'active';
            }
            catch (e) {
                this.state = 'inactive';
            }
            finally {
                setTimeout(() => this.update(), DesktopAppPinger.UPDATE_TIMEOUT);
            }
        });
    }
    sendPing() {
        return __awaiter(this, void 0, void 0, function* () {
            const url = 'http://localhost:8500/rest/v1/ping';
            return new Promise((resolve, reject) => {
                const xrequest = new XMLHttpRequest();
                xrequest.open("GET", url);
                xrequest.onload = () => {
                    resolve();
                };
                xrequest.onerror = () => {
                    const { status, responseText } = xrequest;
                    reject(new Error(`Request failed to: ${url} ${status}: ${responseText}`));
                };
                xrequest.send();
            });
        });
    }
}
DesktopAppPinger.UPDATE_TIMEOUT = 1000;
chrome.webRequest.onHeadersReceived.addListener(details => {
    if (details.method !== 'GET') {
        return;
    }
    if (!isPDF(details)) {
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
chrome.webRequest.onHeadersReceived.addListener(details => {
    const responseHeaders = details.responseHeaders || [];
    if (isPDF(details)) {
        responseHeaders.push({ name: 'Access-Control-Allow-Origin', value: ALLOWED_ORIGINS });
    }
    return { responseHeaders };
}, {
    urls: [
        '<all_urls>'
    ]
}, ['blocking', 'responseHeaders']);
const ENABLE_FILE_URLS = false;
if (ENABLE_FILE_URLS) {
    chrome.webRequest.onBeforeRequest.addListener((details) => __awaiter(this, void 0, void 0, function* () {
        if (isDownloadable(details)) {
            return;
        }
        const response = yield fetch(details.url, { mode: 'no-cors' });
        const blob = yield response.blob();
        const url = URL.createObjectURL(blob);
        const viewerUrl = getViewerURL(url);
        return { redirectUrl: viewerUrl, };
    }), {
        urls: [
            'file://*/*.pdf',
            'file://*/*.PDF',
        ],
        types: ['main_frame', 'sub_frame'],
    }, ['blocking']);
}
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
        loadLink(INITIAL_URL);
        localStorage.setItem('has-downloaded', 'true');
    }
    else {
    }
});
//# sourceMappingURL=background.js.map