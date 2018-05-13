const sass = require('@stencil/sass');

exports.config = {
    namespace: 'waf',
    plugins: [
        sass({ includePaths: ['./node_modules/material-design-lite/src'] })
    ],
    outputTargets: [{
            type: 'dist'
        },
        {
            type: 'www',
            serviceWorker: false
        }
    ],
    globalScript: 'src/global/index.ts'
};

exports.devServer = {
    root: 'www',
    watchGlob: '**/**'
}