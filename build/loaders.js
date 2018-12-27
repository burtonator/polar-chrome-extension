import path from 'path'
import CssExtractPlugin from 'mini-css-extract-plugin'

export const threadLoader = {
  loader: 'thread-loader',
  options: {
    poolTimeout: Infinity,
    workers: require('os').cpus().length - 1,
  },
}

export const babelLoader = {
  loader: 'babel-loader',
}

export const tsLoader = {
  loader: 'ts-loader',
  options: {
    happyPackMode: true,
  },
}

export const injectStylesLoader = {
  loader: 'style-loader',
}

export const extractStylesLoader = {
  loader: CssExtractPlugin.loader,
}

export const cssModulesLoader = {
  loader: 'css-loader',
  options: {
    modules: true,
    importLoaders: 1,
  },
}

export const cssVanillaLoader = {
  loader: 'css-loader',
}

export const urlLoader = {
  loader: 'url-loader',
  options: {
    limit: 8192,
  },
}

export const svgLoader = {
  test: /\.svg$/,
  include: /node_modules/,
  loader: 'svg-inline-loader',
}

export default ({ mode, context, isCI = false, injectStyles = false }) => {
  const styleLoader = injectStyles ? injectStylesLoader : extractStylesLoader

  const main = {
    test: /\.(j|t)sx?$/,
    include: path.resolve(context, './src'),
    use: [babelLoader, tsLoader],
  }

  const cssModules = {
    test: /\.css$/,
    include: path.resolve(context, './src'),
    use: [styleLoader, cssModulesLoader],
  }

  const cssVanilla = {
    test: /\.css$/,
    include: path.resolve(context, './node_modules'),
    use: [styleLoader, cssVanillaLoader],
  }

  const imgLoader = {
    test: /\.(png|jpg|gif|svg)$/,
    include: path.resolve(context, './img'),
    use: [urlLoader],
  }

  if (mode !== 'production') {
    main.use = [threadLoader, ...main.use]
  }

  return [main, imgLoader, cssModules, cssVanilla]
}
