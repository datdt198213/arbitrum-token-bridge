import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import BridgeRoute from "./bridge.route";

class Routes {
  public express: express.Application;

  constructor() {
    this.express = express();
    this.middleware();
    this.routes();
  }

  private middleware(): void {
    this.express.use(helmet())
    this.express.use(compression());
    this.express.use(express.json());
    this.express.use(express.urlencoded({ extended: true }));
    this.express.use(cors());
  }

  private routes(): void {
    this.express.use('/bridge', BridgeRoute);
  }
}

export default Routes;
