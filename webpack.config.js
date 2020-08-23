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
            presets: ['@babel/preset-env', '@babel/preset-typescript'],
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
    extensions: ['.ts', '.tsx', '.js', '.json'],
    mainFields: ['index.ts', 'index.tsx'],
  },
  mode: 'development',
  optimization: {
    minimize: false,
  },
};
