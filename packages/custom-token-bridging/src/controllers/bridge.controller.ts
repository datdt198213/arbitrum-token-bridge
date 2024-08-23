import HttpStatus from "http-status-codes";
import { Request, Response } from "express";
import axios from "axios";
import moment from "moment";
import path from "path";
import { ethers, providers, Wallet } from "ethers";
import appConfig from "@/config/app.config";
import { Logger } from "@/lib/logger.lib";
import { IController } from "./interface.controller";

import {
    deposit, withdraw
} from "@/lib/bridge";
import { StardustCustodialSDK, StardustWallet } from "@stardust-gg/stardust-custodial-sdk";
import { Operator, listOperators } from "@/lib/operators";

require("dotenv").config(); //initialize dotenv

// Chain config
const STARDUST_API_KEY: string = String(process.env.STARDUST_API_KEY);
const sdk = new StardustCustodialSDK(STARDUST_API_KEY);
const provider = new ethers.providers.JsonRpcProvider(String(process.env.PARENT_RPC))
const options = { method: "GET", headers: { "x-api-key": STARDUST_API_KEY } };

async function getWalletFromProfileID(profileID: string) {
    const profile = await sdk.getProfile(profileID);
    // console.log(profile)
    const { wallet } = profile;
    const walletID = wallet.evm.walletId;

    const res = await fetch(
        `https://vault-api.stardust.gg/v1/wallet/${walletID}?includeAddresses=evm`,
        options
    );
    var resultTmp = await res.json();
    const walletAddress = resultTmp.addresses.evm;
    return {wallet, walletAddress};
}

async function getSignerFromCustodialWallet(wallet: StardustWallet) {
    return wallet.ethers.v5.getSigner().connect(provider)
}

export function getErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message;
    return String(error);
}

export class BridgeController implements IController {
    public delete(req: Request, res: Response) {
        throw new Error("Method not implemented.");
    }

    public put(req: Request, res: Response) {
        throw new Error("Method not implemented.");
    }

    public async get(req: Request, res: Response) {
        Promise.reject(new Error("Method not implemented."));
    }

    public async post(req: Request, res: Response) {
        Promise.reject(new Error("Method not implemented."));
    }

    // Get Token (s)
    public async getToken(req: Request, res: Response) {
        Logger.getInstance().info(
            `GET Token  - Accept request from ${req.get("User-Agent")} - ${
                req.ip
            }`
        );
        Logger.getInstance().info(
            `GET Token  - Request with params ${JSON.stringify(req.query)}`
        );
        try {
            console.log(listOperators)
            var res_test = JSON.stringify({}, null, 2);
            Logger.getInstance().info(`Get Tokens success `);
            res.status(HttpStatus.OK).send(res_test);
        } catch (err) {
            Logger.getInstance().error(`Get Token error`);
            res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(
                getErrorMessage(err)
            );
        }
    }

    public async deposit(req: Request, res: Response) {
        Logger.getInstance().info(
            `DEPOSIT Token  - Accept request from ${req.get("User-Agent")} - ${
                req.ip
            }`
        );
        Logger.getInstance().info(
            `Depost Token  - Request with params ${JSON.stringify(req.query)}`
        );
        
        var status_error = HttpStatus.INTERNAL_SERVER_ERROR;
        var message_error;

        try {
            if (
                req.body.constructor === Object &&
                Object.keys(req.body).length === 0
            ) {
                status_error = HttpStatus.BAD_REQUEST;
                message_error = JSON.stringify(
                    { message: "Invalid request body" },
                    null,
                    2
                );
                throw new Error(message_error);
            }

            const custodialProfileId = req.body.custodialProfileId;
            const tokenAmount = req.body.tokenAmount;
            const parentTokenAddr = req.body.parentTokenAddr;
            const l3Wallet = req.body.l3Wallet;
            const {wallet, walletAddress} = await getWalletFromProfileID(custodialProfileId);
            const l2Signer = await getSignerFromCustodialWallet(wallet);
            const timeDeposit = Date.now();
            // console.log(await signer.getAddress(), tokenAmount, parentTokenAddr, l3Wallet);
            let [resultDeposit, message]: any = await deposit(l2Signer, tokenAmount, parentTokenAddr, l3Wallet)
            const timeFinishDeposit = Date.now() - timeDeposit;
            console.log(`Time deposit on BlockChain: ${timeFinishDeposit}`);

            if (resultDeposit) {
                Logger.getInstance().info(
                    `The transaction hash success is: ${message}`
                );
                res.status(HttpStatus.OK).send(
                    `The transaction hash success is: ${message}`
                );
            } else {
                status_error = HttpStatus.INTERNAL_SERVER_ERROR;
                message_error = message;
                throw new Error(message_error);
            }
        } catch (err) {
            Logger.getInstance().error(
                `Deposit token error: ${getErrorMessage(
                    err
                )}`
            );
            res.status(status_error).send(getErrorMessage(err));
        }
    }

    // Create collection using ProfileID
    /*
    public async createCollection(req: Request, res: Response) {
        Logger.getInstance().info(
            `Create Collection using ProfileID - Accept request from ${req.get(
                "User-Agent"
            )} - ${req.ip}`
        );
        Logger.getInstance().info(
            `Create Collection using ProfileID - Request with body ${JSON.stringify(
                req.body
            )}`
        );

        var status_error = HttpStatus.INTERNAL_SERVER_ERROR;
        var message_error;
        try {
            if (
                req.body.constructor === Object &&
                Object.keys(req.body).length === 0
            ) {
                status_error = HttpStatus.BAD_REQUEST;
                message_error = JSON.stringify(
                    { message: "Invalid request body" },
                    null,
                    2
                );
                throw new Error(message_error);
            }

            const name = req.body.name;
            const symbol = req.body.symbol;
            const dataPath = req.body.dataPath;
            const adminProfile = req.body.admin;
            const adminWallet = await getWalletFromProfileID(adminProfile);

            // Select operator
            var operator_tmp: Operator = await selectOperator();
            let operatorId_tmp = `operator-${operator_tmp.address}`;
            let queue = operatorQueues[operatorId_tmp];
            Logger.getInstance().info(`operator_tmp ${operator_tmp.address}`);

            const timeLock = Date.now();
            let [resultLock, message]: any = await createCollection(
                name,
                symbol,
                dataPath,
                adminWallet,
                operator_tmp.address,
                operator_tmp.privateKey,
                queue
            );
            const timeFinishLock = Date.now() - timeLock;
            console.log(`Time Lock on BlockChain: ${timeFinishLock}`);

            if (resultLock) {
                Logger.getInstance().info(
                    `The transaction hash success is: ${message}`
                );
                res.status(HttpStatus.OK).send(
                    `The transaction hash success is: ${message}`
                );
            } else {
                status_error = HttpStatus.INTERNAL_SERVER_ERROR;
                message_error = JSON.stringify(
                    {
                        message: `ERROR when CREATE COLLECTION ${name} with reason ${message} `,
                    },
                    null,
                    2
                );
                throw new Error(message_error);
            }
        } catch (err) {
            Logger.getInstance().error(
                `Create collection token using ProfileID error: ${getErrorMessage(
                    err
                )}`
            );
            console.log(err);
            res.status(status_error).send(getErrorMessage(err));
        }
    }
    */


}
