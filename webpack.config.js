// Copyright (C) 2017-2023 Smart code 203358507

const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const webpack = require('webpack');
const threadLoader = require('thread-loader');
const HtmlWebPackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const WorkboxPlugin = require('workbox-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const packageJson = require('./package.json');

const COMMIT_HASH = execSync('git rev-parse HEAD').toString().trim();

// Asset paths are keyed on this. In production that's the commit hash (stable,
// cacheable). Under `webpack serve` (WEBPACK_SERVE is set automatically) we're
// editing files without committing between restarts, so the commit hash never
// changes across restarts -- a long-lived host (e.g. the Stremio desktop shell's
// WebView2 cache) can keep serving a stale bundle from a previous run forever.
// Append a per-restart timestamp so every dev-server restart forces a fresh fetch.
const BUILD_PATH_ID = process.env.WEBPACK_SERVE ? `${COMMIT_HASH}-${Date.now()}` : COMMIT_HASH;

// Under WSL2, 127.0.0.1 resolves to the WSL VM itself, not the Windows host
// where the real streaming server (127.0.0.1:11470 from Windows' perspective)
// actually runs. Resolve the Windows host IP as seen from inside WSL so the
// devServer proxy below can reach it.
const WINDOWS_HOST_IP = (() => {
    try {
        return execSync("ip route show default | awk '{print $3}'").toString().trim() || '127.0.0.1';
    } catch (_) {
        return '127.0.0.1';
    }
})();

const THREAD_LOADER = {
    loader: 'thread-loader',
    options: {
        name: 'shared-pool',
        workers: os.cpus().length,
    },
};

threadLoader.warmup(
    THREAD_LOADER.options,
    [
        'babel-loader',
        'ts-loader',
        'css-loader',
        'postcss-loader',
        'less-loader',
    ],
);

module.exports = (env, argv) => ({
    mode: argv.mode,
    devtool: argv.mode === 'production' ? 'source-map' : 'eval-source-map',
    entry: {
        main: './src/index.js',
        worker: './node_modules/@stremio/stremio-core-web/worker.js'
    },
    output: {
        path: path.join(__dirname, 'build'),
        filename: `${BUILD_PATH_ID}/scripts/[name].js`,
        clean: true,
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules/,
                use: [
                    THREAD_LOADER,
                    {
                        loader: 'babel-loader',
                        options: {
                            presets: [
                                '@babel/preset-env',
                                '@babel/preset-react'
                            ],
                        }
                    }
                ]
            },
            {
                test: /\.(ts|tsx)$/,
                exclude: /node_modules/,
                use: [
                    THREAD_LOADER,
                    {
                        loader: 'ts-loader',
                        options: {
                            happyPackMode: true,
                        }
                    }
                ]
            },
            {
                test: /\.less$/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: MiniCssExtractPlugin.loader,
                        options: {
                            esModule: false
                        }
                    },
                    THREAD_LOADER,
                    {
                        loader: 'css-loader',
                        options: {
                            esModule: false,
                            importLoaders: 2,
                            modules: {
                                namedExport: false,
                                localIdentName: '[local]-[hash:base64:5]'
                            }
                        }
                    },
                    {
                        loader: 'postcss-loader',
                        options: {
                            postcssOptions: {
                                plugins: [
                                    ['cssnano', {
                                        preset: [
                                            'advanced',
                                            {
                                                autoprefixer: {
                                                    add: true,
                                                    remove: true,
                                                    flexbox: false,
                                                    grid: false
                                                },
                                                cssDeclarationSorter: true,
                                                calc: false,
                                                colormin: false,
                                                convertValues: false,
                                                discardComments: {
                                                    removeAll: true,
                                                },
                                                discardOverridden: false,
                                                discardUnused: false,
                                                mergeIdents: false,
                                                normalizeDisplayValues: false,
                                                normalizePositions: false,
                                                normalizeRepeatStyle: false,
                                                normalizeUnicode: false,
                                                normalizeUrl: false,
                                                reduceIdents: false,
                                                reduceInitial: false,
                                                zindex: false
                                            }
                                        ]
                                    }]
                                ]
                            }
                        }
                    },
                    {
                        loader: 'less-loader',
                        options: {
                            lessOptions: {
                                strictMath: true,
                                ieCompat: false
                            }
                        }
                    }
                ]
            },
            {
                test: /\.(ttf|woff2)$/,
                exclude: /node_modules/,
                type: 'asset/resource',
                generator: {
                    filename: 'fonts/[name][ext][query]'
                }
            },
            {
                test: /\.(png|jpe?g|svg)$/,
                exclude: /node_modules/,
                type: 'asset/resource',
                generator: {
                    filename: 'images/[name][ext][query]'
                }
            },
            {
                test: /\.wasm$/,
                type: 'asset/resource',
                generator: {
                    filename: `${BUILD_PATH_ID}/binaries/[name][ext][query]`
                }
            }
        ]
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js', '.json', '.less', '.wasm'],
        alias: {
            'stremio': path.resolve(__dirname, 'src'),
            'stremio-router': path.resolve(__dirname, 'src', 'router')
        }
    },
    devServer: {
        host: '0.0.0.0',
        static: false,
        hot: false,
        // Plain http avoids the self-signed dev cert being silently rejected
        // by the Desktop shell's networking layer (unlike a browser tab, it
        // has no "proceed anyway" click-through). Chromium/WebView2 treat
        // localhost as a secure context over http too, so nothing is lost.
        server: 'http',
        liveReload: false,
        // Selecting https://localhost:8080/ as the active streaming server URL
        // (Desktop app > Settings > Streaming) makes stremio-core-web fetch
        // these paths directly against this origin. Forward them to the real
        // local streaming engine so the browser never sees a cross-origin request.
        proxy: [
            {
                context: [
                    '/settings',
                    '/casting',
                    '/network-info',
                    '/device-info',
                ],
                target: `http://${WINDOWS_HOST_IP}:11470`,
                changeOrigin: true,
            },
            {
                // Torrent streaming/stats/subtitle endpoints are all namespaced
                // under /<infoHash>/... (a 40-char hex string) on the real engine.
                // NOTE: our own build output is also namespaced under a 40-char
                // hex prefix (the git commit hash). stremio-core-web's own worker
                // bootstrap references the RAW commit hash directly (not our
                // timestamped BUILD_PATH_ID), so exclude the bare commit hash
                // prefix too -- otherwise that request gets misrouted to the
                // streaming server instead of this dev server, worker.js never
                // loads, and the WASM core silently never finishes booting
                // (blank page, no console error).
                context: (pathname) => /^\/[0-9a-f]{40}(\/|$)/i.test(pathname) && !pathname.startsWith(`/${COMMIT_HASH}`),
                target: `http://${WINDOWS_HOST_IP}:11470`,
                changeOrigin: true,
            },
            {
                // The desktop shell's WebView2 host appears to only allow the
                // page to fetch() same-origin / the active streaming-server
                // origin -- a raw cross-port fetch to 127.0.0.1:4747 never
                // leaves the renderer. Route it through this same origin
                // instead. detection-engine runs in WSL alongside this dev
                // server, so no Windows-host-IP translation is needed here.
                context: ['/analyze'],
                target: 'http://127.0.0.1:4747',
                changeOrigin: true,
            },
        ],
    },
    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin({
                test: /\.js$/,
                extractComments: false,
                terserOptions: {
                    ecma: 5,
                    mangle: true,
                    warnings: false,
                    output: {
                        comments: false,
                        beautify: false,
                        wrap_iife: true
                    }
                }
            })
        ]
    },
    plugins: [
        new webpack.ProgressPlugin(),
        new webpack.EnvironmentPlugin({
            SENTRY_DSN: null,
            SERVICE_WORKER_DISABLED: false,
            ...env,
            DEBUG: argv.mode !== 'production',
            VERSION: packageJson.version,
            // NOTE: intentionally BUILD_PATH_ID, not the raw COMMIT_HASH, in dev.
            // @stremio/stremio-core-web reads process.env.COMMIT_HASH at runtime
            // to construct its own worker/wasm asset URLs -- if that doesn't match
            // the actual emitted path prefix (BUILD_PATH_ID, which includes a
            // per-restart timestamp under `webpack serve`), those requests 404
            // and the WASM core silently never finishes initializing (blank page,
            // no console error, since the library doesn't surface the failure).
            COMMIT_HASH: BUILD_PATH_ID
        }),
        new webpack.ProvidePlugin({
            Buffer: ['buffer', 'Buffer']
        }),
        argv.mode === 'production' && env.SERVICE_WORKER_DISABLED !== 'true' &&
            new WorkboxPlugin.GenerateSW({
                maximumFileSizeToCacheInBytes: 20000000,
                clientsClaim: true,
                skipWaiting: true
            }),
        new CopyWebpackPlugin({
            patterns: [
                { from: 'assets/favicons', to: 'favicons' },
                { from: 'assets/images', to: 'images' },
                { from: 'assets/screenshots/*.webp', to: 'screenshots/[name][ext]' },
                { from: '.well-known', to: '.well-known' },
                { from: 'manifest.json', to: 'manifest.json' },
            ]
        }),
        new MiniCssExtractPlugin({
            filename: `${BUILD_PATH_ID}/styles/[name].css`
        }),
        new HtmlWebPackPlugin({
            template: './src/index.html',
            inject: false,
            scriptLoading: 'blocking',
            faviconsPath: 'favicons',
            imagesPath: 'images',
        }),
    ].filter(Boolean)
});
