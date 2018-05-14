const sass = require('@stencil/sass');

exports.config = {
    namespace: 'waf',
    plugins: [
        sass()
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