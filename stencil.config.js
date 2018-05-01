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
    ]
};

exports.devServer = {
    root: 'www',
    watchGlob: '**/**'
}