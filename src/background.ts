import { browser } from 'webextension-polyfill-ts'

export function loadLink(link: string) {
  browser.tabs.create({ url: link })
}

browser.runtime.onInstalled.addListener(() => {
  loadLink(
    'https://getpolarized.io/download.html?utm_source=chrome_extension_on_installed&utm_medium=chrome_extension',
  )
})
