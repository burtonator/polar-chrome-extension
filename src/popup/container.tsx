import React from 'react'
import { browser } from 'webextension-polyfill-ts'
import { loadLink } from '../background'
import './popup.css'

interface IState {
  saving: boolean
  success: boolean
  failed: boolean
}

class Popup extends React.Component<{}, IState> {
  constructor(props) {
    super(props)
    this.state = {
      saving: false,
      success: false,
      failed: false,
    }
  }
  async componentDidMount() {
    await this.onExtensionActivated().catch(err => {
      this.setState({ failed: true })
      this.closePopup()
      console.error('Unable to send URL to polar: ', err)
    })
  }
  sendLinkToPolar = async (link: string): Promise<void> => {
    console.log('Sending link to polar: ' + link)

    const url = 'http://localapp.getpolarized.io:8500/rest/v1/capture/trigger'

    const data: any = {
      link,
    }

    return new Promise<void>((resolve, reject) => {
      const xrequest = new XMLHttpRequest()
      xrequest.open('POST', url)
      xrequest.onload = () => {
        resolve()
      }
      xrequest.onerror = () => {
        reject('Request failed to: ' + url)
      }
      xrequest.setRequestHeader(
        'Content-Type',
        'application/json; charset=utf-8',
      )
      xrequest.send(JSON.stringify(data))
    })
  }
  closePopup = () => setTimeout(() => window.close(), 7500)
  delayState = () => {
    setTimeout(() => {
      this.setState({
        saving: false,
        success: true,
      })
    }, 1000)
  }
  onExtensionActivated = async () => {
    const [currentTab] = await browser.tabs.query({
      active: true,
      currentWindow: true,
    })
    await this.sendLinkToPolar(currentTab.url)
    this.setState({ saving: true })
    this.delayState()
    this.closePopup()
  }
  render() {
    const successComponent = this.state.success ? (
      <div className="alert alert-secondary success p-1" role="alert">
        <img src="img/icon-32.png" />

        <strong>Page Saved to Polar!</strong>
      </div>
    ) : null
    const savingComponenet = this.state.saving ? (
      <div className="alert alert-secondary saving p-1" role="alert">
        <i className="fas fa-circle-notch fa-spin text-muted" />

        <strong>Saving...</strong>
      </div>
    ) : null
    const failedComponent = this.state.failed ? (
      <div className="alert alert-danger failure p-1" role="alert">
        <strong>
          Failed to save. Please make sure Polar is running. <br />
          <a
            id="download-link"
            href="#"
            onClick={() =>
              loadLink(
                'https://getpolarized.io/download.html?utm_source=chrome_extension_failed&utm_medium=chrome_extension',
              )
            }
            target="_top"
          >
            Click here to download Polar
          </a>
        </strong>
      </div>
    ) : null
    return (
      <div>
        {savingComponenet}
        {successComponent}
        {failedComponent}
      </div>
    )
  }
}

export default Popup
