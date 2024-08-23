import { listOperators } from "./operators";
import { ethers, Signer, BigNumber } from "ethers";
import {
  getArbitrumNetwork,
  Erc20Bridger,
  registerCustomArbitrumNetwork,
  ParentToChildMessageStatus,
} from "@arbitrum/sdk";

import { AdminErc20Bridger } from "@arbitrum/sdk/dist/lib/assetBridger/erc20Bridger";
import { customConduitNetwork, customChildNetwork } from "@/config/network.config";
import { StatusCodes } from "http-status-codes";
import { Logger } from "./logger.lib";

const CHILD_RPC: string = String(process.env.CHILD_RPC);
const childProvider = new ethers.providers.JsonRpcProvider(CHILD_RPC);

export async function register() {}

export async function deposit(
  parentWallet: Signer,
  tokenAmount: BigNumber,
  parentTokenAddr: string,
  beneficiary: string
) {
  // var status
  try {

    registerCustomArbitrumNetwork(customConduitNetwork);

    /**
     * Use arbitrumNetwork to create an Arbitrum SDK Erc20Bridger instance
     * We'll use Erc20Bridger for its convenience methods around transferring token to child
     */
    const arbitrumNetwork = await getArbitrumNetwork(childProvider);
    const erc20Bridger = new Erc20Bridger(arbitrumNetwork);

    /**
     * Because the token might have decimals, we update the amount to deposit taking into account those decimals
     */
    const decimalsIface = new ethers.utils.Interface([
        "function decimals() public view virtual returns (uint8)",
      ]);
      const parentCustomToken = new ethers.Contract(
        parentTokenAddr,
        decimalsIface,
        parentWallet
      );
    const tokenDecimals = await parentCustomToken.decimals();
    const tokenDepositAmount = ethers.BigNumber.from(tokenAmount).mul(
        ethers.BigNumber.from(10).pow(tokenDecimals)
    );
    const evtApprovalABI = [
      "event Approval(address indexed owner, address indexed spender, uint256 value)",
    ];
    const evtApprovalIF = new ethers.utils.Interface(evtApprovalABI);

    /**
     * The Standard Gateway contract will ultimately be making the token transfer call; thus, that's the contract we need to approve.
     * erc20Bridger.approveToken handles this approval
     * Arguments required are:
     * (1) parentSigner: The parent address transferring token to child
     * (2) erc20parentAddress: parent address of the ERC20 token to be depositted to child
     */
    Logger.getInstance().info("Approving:");
    const approveTx = await erc20Bridger.approveToken({
      parentSigner: parentWallet,
      erc20ParentAddress: parentTokenAddr,
    });
    const approveRec = await approveTx.wait();
    var parseLogError,
      txHashDeposit: string = "",
      txHashApprove: string = "";

    for (const log of approveRec.logs) {
      try {
        const mLog = evtApprovalIF.parseLog({
          topics: log.topics,
          data: log.data,
        });
        if (mLog && mLog.name === "Approval") {
          txHashApprove = approveTx.hash;
          Logger.getInstance().info(`Tx approve ${txHashApprove}`);
        }
    } catch (e) {
        parseLogError = e;
        break;
    }
    }
    if (parseLogError != undefined) {
      throw new Error(
        `Transaction Approve() was sent to chain with hash ${txHashApprove} but got error when getting log event: ${parseLogError}`
      );
    }

    /**
     * Deposit DappToken to child using erc20Bridger. This will escrow funds in the Gateway contract on parent, and send a message to mint tokens on child.
     * The erc20Bridge.deposit method handles computing the necessary fees for automatic-execution of retryable tickets — maxSubmission cost & child gas price * gas — and will automatically forward the fees to child as callvalue
     * Also note that since this is the first DappToken deposit onto child, a standard Arb ERC20 contract will automatically be deployed.
     * Arguments required are:
     * (1) amount: The amount of tokens to be transferred to child
     * (2) erc20parentAddress: parent address of the ERC20 token to be depositted to child
     * (2) parentSigner: The parent address transferring token to child
     * (3) childProvider: An child provider
     */

    Logger.getInstance().info("Transferring DappToken to child network:");
    const depositTx = await erc20Bridger.deposit({
      amount: tokenDepositAmount,
      destinationAddress: beneficiary,
      erc20ParentAddress: parentTokenAddr,
      parentSigner: parentWallet,
      childProvider: childProvider,
    });
    /**
     * Now we wait for parent and child side of transactions to be confirmed
     */
    // console.log(
    //   `Deposit initiated: waiting for child network retryable (takes 10-15 minutes;current time: ${new Date().toTimeString()}) `
    // );
    Logger.getInstance().info(`Deposit initiated: waiting for child network retryable (takes 10-15 minutes; current time: ${new Date().toTimeString()})`)
    const depositRec = await depositTx.wait();
    const childResult = await depositRec.waitForChildTransactionReceipt(
      childProvider
    );
    txHashDeposit = childResult.message.retryableCreationId;

    /**
     * The `complete` boolean tells us if the parent to child message was successful
     */

    let status = ParentToChildMessageStatus[childResult.status];
    if (childResult.complete === true) {
      return [status, JSON.stringify(
        {
          txHash: txHashDeposit,
          parentWallet: await parentWallet.getAddress(),
          childWallet: beneficiary,
          amount: tokenDepositAmount,
          statusCode: StatusCodes.OK,
        },
        null,
        2
      )] 
    } else {
      throw new Error(
        `Deposit failed for child network retryable with status "${status}"`
      );
    }
  } catch (e) {
    return JSON.stringify(
      {
        message: `Error when depositing token with reason: ${e}`,
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      },
      null,
      2
    );
  }
}

export async function withdraw() {}

export async function claim(txHash: string, msWallet: Signer) {
    try {
        registerCustomArbitrumNetwork(customConduitNetwork)

    } catch (e) {

    }
}
