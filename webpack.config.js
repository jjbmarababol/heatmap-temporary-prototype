const path = require('path');

module.exports = {
  entry: './src/main.js',
  watch: true,
  mode: 'development',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
  },
};