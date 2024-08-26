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
    try {
        const profile = await sdk.getProfile(profileID);
    
        const { wallet } = profile;
        const walletID = wallet.evm.walletId;
    
        const res = await fetch(
            `https://vault-api.stardust.gg/v1/wallet/${walletID}?includeAddresses=evm`,
            options
        );
    
        if (!res.ok) {
            throw new Error(`Failed to fetch wallet data: ${res.status} ${res.statusText}`);
        }
    
        const resultTmp = await res.json();
        const walletAddress = resultTmp.addresses.evm;
    
        return { wallet, walletAddress };
    } catch (err: any) {
        console.error(`Error occurred: ${err.message}`);
        throw new Error(`Unable to retrieve wallet and address information: ${err.message}`);
    }
    
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
    /*
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
    */

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

            const tokenAmount = req.body.tokenAmount;

            if (req.body.custodialProfileId !== undefined) {
                const custodialProfileId = req.body.custodialProfileId;
                const {wallet, walletAddress} = await getWalletFromProfileID(custodialProfileId);
                const l2Signer = await getSignerFromCustodialWallet(wallet);

                const destinationAddress = req.body.l3Wallet !== undefined ? req.body.l3Wallet : walletAddress;
                
                const timeDeposit = Date.now();
                let [resultDeposit, message]: any = await deposit(l2Signer, tokenAmount, destinationAddress);
                const timeFinishDeposit = Date.now() - timeDeposit;
                Logger.getInstance().info(`Time deposit on BlockChain: ${timeFinishDeposit}`);
                
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

            } else if (req.body.coinbaseWallet !== undefined) {
                
            } else {
                message_error = "Unable to get an l2 wallet to deposit funds";
                throw new Error (message_error);
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

}
