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
    ],
    copy: [
        { src: './wcs-assets/**/*' }
    ]
};

exports.devServer = {
    root: 'www',
    watchGlob: '**/**'
}