// `nest build --webpack` config. The API is CommonJS but the shared packages
// (@rajyarank/*) are ESM/TS; bundling them here produces a self-contained
// dist/main.js and sidesteps the CJS↔ESM runtime boundary. Real node_modules
// are externalised (kept in node_modules), the workspace packages are bundled.
const path = require('node:path');

module.exports = (options) => ({
  ...options,
  module: {
    ...options.module,
    // Force ts-loader to transpile-only. The bundled workspace packages live
    // outside the API's rootDir, which trips TS6059 under full type-checking;
    // types are verified separately by `pnpm typecheck`.
    rules: [
      {
        test: /\.ts$/,
        loader: 'ts-loader',
        exclude: /node_modules/,
        options: {
          transpileOnly: true,
          onlyCompileBundledFiles: true,
          configFile: path.resolve(__dirname, 'tsconfig.json'),
          // Widen rootDir to the monorepo root so bundled @rajyarank/* source
          // (outside apps/api) doesn't trip TS6059 during config resolution.
          compilerOptions: { rootDir: path.resolve(__dirname, '../..') },
        },
      },
    ],
  },
  externals: [
    ({ request }, callback) => {
      if (!request) return callback();
      if (request.startsWith('@rajyarank/')) return callback(); // bundle workspace src
      if (request.startsWith('.') || path.isAbsolute(request)) return callback();
      return callback(null, 'commonjs ' + request); // externalise real deps
    },
  ],
});
