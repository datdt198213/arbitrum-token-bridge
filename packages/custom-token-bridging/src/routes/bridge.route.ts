import express from "express";
import cors from "cors";
import { camelcase } from "@/config/middleware.config";
import { Logger } from "@/lib/logger.lib";

import { BridgeController } from "@/controllers/bridge.controller";

class BridgeRoute {
    public express: express.Application;

    constructor() {
        this.express = express();
        this.middleware();
        this.routes();
    }

    // Configure Express middleware.
    private middleware(): void {
        this.express.use(camelcase());
        this.express.use(express.json());
        this.express.use(express.urlencoded({ extended: false }));
        this.express.use(cors());
    }

    private routes(): void {
        const controller = new BridgeController();

        // this.express.get("/get", (req, res) => {
        //     controller.getToken(req, res).catch((err) => {
        //         Logger.getInstance().error(err);
        //     });
        // });
        this.express.post("/deposit", async (req, res) => {
            controller.deposit(req, res).catch((err) => {
                Logger.getInstance().error(err);
            });
        });
        this.express.post("/withdraw", async (req, res) => {
            controller.withdraw(req, res).catch((err) => {
                Logger.getInstance().error(err);
            });
        });
        this.express.post("/claim", async (req, res) => {
            controller.withdraw(req, res).catch((err) => {
                Logger.getInstance().error(err);
            });
        });
    }
}

export default new BridgeRoute().express;
