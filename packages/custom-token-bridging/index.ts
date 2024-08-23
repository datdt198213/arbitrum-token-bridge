import http from 'http';
import dotenv from 'dotenv';
dotenv.config({ path: `${__dirname}/.env` });

import appConfig from '@/config/app.config';
import { Logger } from '@/lib/logger.lib';
import App from './app';
// import {get_transaction_count} from "./src/lib/test_nfts_edge2_copy"

const port = appConfig.server.port;

App.set('port', port);
const server = http.createServer(App);
server.listen(port);

server.on('listening', (): void => {
  const addr = server.address();
  const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${appConfig.server.port}`;
//   get_transaction_count();
  Logger.getInstance().info(`Listening on ${bind}`);
});

module.exports = App;
