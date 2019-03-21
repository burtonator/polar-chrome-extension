const path = require('path')
const fs = require('fs')
const { config: configEnv } = require('dotenv')
const ChromeStore = require('chrome-webstore-upload')
const signAddon = require('sign-addon').default

const ENV_FILE = 'publish.sh'
const envPath = path.resolve(process.cwd(), ENV_FILE)

if (!fs.existsSync(envPath)) {
    console.error('Secret env file is missing; cannot proceed with publish')
    process.exit(1)
}

configEnv({ path: envPath })

async function publishChrome() {
    try {
        const extensionID = process.env.WEBSTORE_EXTENSION_ID
        const webStore = ChromeStore({
            extensionId: extensionID,
            clientId: process.env.WEBSTORE_CLIENT_ID,
            clientSecret: process.env.WEBSTORE_CLIENT_SECRET,
            refreshToken: process.env.WEBSTORE_REFRESH_TOKEN,
        })

        const token = await webStore.fetchToken()

        await webStore.uploadExisting(
            fs.createReadStream('dist/extension.zip'),
            token,
        )

        await webStore.publish('default', token)
    } catch (error) {
        console.error('Chrome publish error:', error)
    }
}

async function publishFF() {
    try {
        const result = await signAddon({
            id: 'admin@getpolarized.io',
            xpiPath: 'dist/extension.zip',
            version: process.env.npm_package_version,
            apiKey: process.env.AMO_API_KEY,
            apiSecret: process.env.AMO_API_SECRET,
            channel: 'listed',
            downloadDir: 'downloaded_amo',
        })

        if (result.success) {
            console.log('The following signed files were downloaded:')
            console.log(result.downloadedFiles)
            console.log('Your extension ID is:')
            console.log(result.id)
        } else {
            console.error('Your add-on could not be signed!')
            console.error('Check the console for details.')
        }
    } catch (error) {
        console.error('FF signing error:', error)
    }
}

publishFF().then(publishChrome)
