import http from 'http';

import express from 'express';
import Logger from './loaders/logger';
import config from './config';
import { createWebSocketServer } from './core/websocket';

async function startServer() {
    const app = express();


    await require('./loaders').default({ expressApp: app });

    const server = http.createServer(app);

    createWebSocketServer(server);

    
    server.listen(config.port, '0.0.0.0', () => {
        Logger.info(`
      ################################################
      🛡️  Server đang chạy tại PORT: ${config.port} 🛡️
      ################################################
    `);
    }).on('error', err => {
        Logger.error(err);
        process.exit(1);
    })
}
startServer();