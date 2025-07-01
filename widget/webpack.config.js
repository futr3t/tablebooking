const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    entry: './src/index.tsx',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'widget.js',
      library: 'TablebookingWidget',
      libraryTarget: 'umd',
      globalObject: 'this',
      clean: true,
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js', '.jsx'],
    },
    module: {
      rules: [
        {
          test: /\.(ts|tsx)$/,
          use: 'babel-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: [
            'style-loader',
            {
              loader: 'css-loader',
              options: {
                modules: {
                  auto: true,
                  localIdentName: isProduction 
                    ? 'tb-[hash:base64:8]' 
                    : 'tb-[name]__[local]--[hash:base64:5]',
                },
              },
            },
          ],
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './public/index.html',
        filename: 'demo.html',
      }),
    ],
    externals: isProduction ? {
      'react': 'React',
      'react-dom': 'ReactDOM',
    } : {},
    devServer: {
      static: path.join(__dirname, 'dist'),
      port: 3002,
      hot: true,
      open: true,
    },
    optimization: {
      minimize: isProduction,
    },
  };
};