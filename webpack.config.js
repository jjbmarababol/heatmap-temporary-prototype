const path = require('path');

module.exports = {
  entry: './src/main.js',
  watch: false,
  mode: 'development',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
  },
};