'use strict';

import { CommonHelper } from '../helper/common.helper';

const defaults = {
  server: {
    port: 3000,
  },
};

const appConfig = {
  log: {
    consoleLevel: process.env.LOG_CONSOLE_LEVEL || 'debug',
    fileLevel: process.env.LOG_FILE_LEVEL || 'debug',
  },
  server: {
    port: CommonHelper.normalizePort(process.env.SERVER_PORT || defaults.server.port),
  },
  seven_seg_addr: process.env.SEVEN_SEG_ADDR || 'http://0.0.0.0:5100',
};

export default appConfig;
