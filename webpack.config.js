const path = require('path');

module.exports = {
    entry: {
        index: './src/index.js',
        popup: './src/popup/popup.js',
        'site-list': './src/site-list.js'
    },
    output: {
        path: path.resolve(__dirname, 'build'),
        filename: '[name].js'
    },
    module: {
        rules: [
            { test: /\.html$/, use: 'html-loader' },
            { test: /\.css$/, use: 'css-loader' }
        ]
    }
};
