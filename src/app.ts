import express from 'express';
import Logger from './loaders/logger';
import config from './config';

async function startServer() {
    const app = express();


    await require('./loaders').default({ expressApp: app });

    
    app.listen(config.port, '0.0.0.0', () => {
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