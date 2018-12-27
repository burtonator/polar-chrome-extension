import { exec } from 'child_process'
import { EnvironmentPlugin } from 'webpack'
import CopyPlugin from 'copy-webpack-plugin'
import HtmlPlugin from 'html-webpack-plugin'
import HtmlIncAssetsPlugin from 'html-webpack-include-assets-plugin'
import BuildNotifPlugin from 'webpack-build-notifier'
import CssExtractPlugin from 'mini-css-extract-plugin'
import ZipPlugin from 'zip-webpack-plugin'
import PostCompilePlugin from 'post-compile-webpack-plugin'

import initEnv from './env'
import * as staticFiles from './static-files'
import { output } from './config'

export default function({
  webExtReloadPort = 9090,
  mode = 'development',
  template,
  notifsEnabled = false,
  isCI = false,
  shouldPackage = false,
  packagePath = '../dist',
  extPackageName = 'extension.zip',
  sourcePackageName = 'source-code.zip',
}) {
  const plugins = [
    new EnvironmentPlugin(initEnv({ mode })),
    new CopyPlugin(staticFiles.copyPatterns),
    new HtmlPlugin({
      title: 'Save to Polar',
      chunks: ['popup'],
      filename: 'popup.html',
      template,
    }),
    new HtmlIncAssetsPlugin({
      append: false,
      assets: staticFiles.htmlAssets,
    }),
    new CssExtractPlugin({
      filename: '[name].css',
    }),
  ]

  if (notifsEnabled) {
    plugins.push(
      new BuildNotifPlugin({
        title: 'Polar Build',
      }),
    )
  }

  if (shouldPackage) {
    plugins.push(
      new ZipPlugin({
        path: packagePath,
        filename: extPackageName,
        exclude: [/\.map/],
      }),
      new PostCompilePlugin(() =>
        exec('git archive -o dist/source-code.zip master'),
      ),
    )
  }

  return plugins
}
