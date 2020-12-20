module.exports = {
  entry: {
    main: './src/demo/main.tsx',
    tic_tac_toe: './src/demo/tic-tac-toe.tsx',
  },
  module: {
    rules: [
      {
        test: /\.(js|ts)x?$/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-typescript', '@babel/preset-env'],
            plugins: [
              [
                '@babel/plugin-transform-react-jsx',
                { pragma: 'MiniReact.createElement' },
              ],
              '@babel/plugin-proposal-class-properties',
              '@babel/plugin-proposal-object-rest-spread',
            ],
          },
        },
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.json', '.jsx'],
    // 从package.json 的field 字段去搜寻
    mainFields: ['main', 'browser', 'module'],
  },
  mode: 'development',
  optimization: {
    minimize: false,
  },
};
