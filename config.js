// Configurações do ambiente
const isDev = process.argv.includes('--dev');
const isTest = process.env.NODE_ENV === 'test';
const isProd = process.env.NODE_ENV === 'production';

const config = {
  environment: isDev ? 'development' : isTest ? 'testing' : 'production',
  
  app: {
    name: 'Sactorium Desktop',
    version: require('./package.json').version,
    devTools: isDev || isTest
  },
  
  database: {
    file: isDev ? 'sactorium-dev.json' : 
          isTest ? 'sactorium-test.json' : 
          'sactorium-data.json'
  },
  
  window: {
    width: isDev ? 1600 : 1400,
    height: isDev ? 900 : 700,
    webSecurity: isProd
  },
  
  updates: {
    checkForUpdates: isProd,
    autoDownload: false
  }
};

module.exports = config;