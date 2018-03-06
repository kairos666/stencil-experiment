const sass = require('@stencil/sass');

exports.config = {
  namespace: 'mycomponent',
  generateDistribution: true,
  serviceWorker: false,
  plugins: [
    sass({ includePaths: ['./node_modules/material-design-lite/src'] })
  ]
};

exports.devServer = {
  root: 'www',
  watchGlob: '**/**'
}
