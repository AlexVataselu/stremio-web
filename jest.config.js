// Copyright (C) 2017-2026 Smart code 203358507

module.exports = {
    transform: {
        '^.+\\.jsx?$': ['babel-jest', { presets: ['@babel/preset-env', '@babel/preset-react'] }],
    },
    setupFilesAfterEnv: ['<rootDir>/tests/setupTests.js'],
};
