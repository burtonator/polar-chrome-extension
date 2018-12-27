import initConfig from './build'

export default (env = {}) => {
  const conf = initConfig({
    context: __dirname,
    mode: env.prod ? 'production' : 'development',
    notifsEnabled: !!env.notifs,
    shouldPackage: !!env.package,
  })

  return conf
}
