module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'transform-inline-environment-variables',
        {
          include: [
            'NODE_ENV'
          ]
        }
      ]
    ],
    env: {
      test: {
        plugins: [
          '@babel/plugin-transform-modules-commonjs'
        ]
      }
    }
  };
};