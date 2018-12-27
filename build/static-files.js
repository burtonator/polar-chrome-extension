export const htmlAssets = [
  'css/all.min.css',
  'css/bootstrap.min.css',
  'lib/browser-polyfill.js',
]

function transformManifestVersion(content) {
  const manifest = JSON.parse(content.toString())
  manifest.version = process.env.npm_package_version
  return Buffer.from(JSON.stringify(manifest))
}

export const copyPatterns = [
  {
    from: 'src/manifest.json',
    to: '.',
    transform: transformManifestVersion,
  },
  { from: 'img', to: 'img' },
  {
    from: 'node_modules/webextension-polyfill/dist/browser-polyfill.js',
    to: 'lib/',
  },
  {
    from: 'node_modules/@fortawesome/fontawesome-free/css/all.min.css',
    to: 'css/',
  },
  {
    from: 'node_modules/@fortawesome/fontawesome-free/webfonts/*',
    to: 'webfonts/[name].[ext]',
  },
  {
    from: 'node_modules/bootstrap/dist/css/bootstrap.min.css',
    to: 'css/',
  },
]
