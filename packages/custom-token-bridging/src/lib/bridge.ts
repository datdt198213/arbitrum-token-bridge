import { listOperators } from "./operators";
import { ethers, Signer, BigNumber, Contract } from "ethers";
import {
  getArbitrumNetwork,
  Erc20Bridger,
  registerCustomArbitrumNetwork,
  ParentToChildMessageStatus,
  ChildToParentMessageStatus,
  ChildTransactionReceipt,
} from "@arbitrum/sdk";

import { AdminErc20Bridger } from "@arbitrum/sdk/dist/lib/assetBridger/erc20Bridger";
import { customConduitNetwork } from "@/config/network.config";
import { StatusCodes } from "http-status-codes";
import { Logger } from "./logger.lib";

const parentTokenAddr: string = String(process.env.PARENT_TOKEN);
const childTokenAddr: string = String(process.env.CHILD_TOKEN);
const CHILD_RPC: string = String(process.env.CHILD_RPC);
const PARENT_RPC: string = String(process.env.PARENT_RPC);
const childProvider = new ethers.providers.JsonRpcProvider(CHILD_RPC);
const parentProvider = new ethers.providers.JsonRpcProvider(PARENT_RPC);
const OPERATOR_KEY: string = String(process.env.OPERATOR_KEY);
const PROXY_KEY: string = String(process.env.PROXY_KEY);

export async function register() {}

async function balanceOfERC20(
  contractAddress: string,
  account: string,
  provider: any
) {
  const abi = [
    "function balanceOf(address account) external view returns (uint256)",
  ];
  const contract = new Contract(contractAddress, abi, provider);
  const balanceERC20 = await contract.balanceOf(account);
  return balanceERC20;
}

export async function deposit(
  parentWallet: Signer,
  tokenAmount: BigNumber,
  beneficiary: string
): Promise<[boolean, string]> {
  // var status
  try {
    const balanceERC20 = await balanceOfERC20(
      parentTokenAddr,
      await parentWallet.getAddress(),
      parentProvider
    );

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

    if (tokenDepositAmount.gt(balanceERC20)) {
      throw new Error(
        `Insufficient Balance ${ethers.utils.formatUnits(
          tokenDepositAmount
        )} > ${ethers.utils.formatUnits(
          balanceERC20
        )} (Deposit amount > Current balance) in L2`
      );
    }

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
          Logger.getInstance().info(
            `Approve successfully! Tx approve ${txHashApprove}`
          );
        }
      } catch (e) {
        parseLogError = e;
        break;
      }
    }
    if (parseLogError !== undefined) {
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

    Logger.getInstance().info(
      `Deposit initiated: waiting for child network retryable (takes 10-15 minutes; current time: ${new Date().toTimeString()})`
    );
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
      return [
        true,
        JSON.stringify(
          {
            txHash: txHashDeposit,
            parentWallet: await parentWallet.getAddress(),
            childWallet: beneficiary,
            amount: tokenDepositAmount,
            statusCode: StatusCodes.OK,
          },
          null,
          2
        ),
      ];
    } else {
      throw new Error(
        `Failed for child network retryable with status "${status}"`
      );
    }
  } catch (e: any) {
    return [false, e.message];
  }
}

async function transferFrom(
  contractAddress: string,
  signer: Signer,
  from: string,
  to: string,
  value: BigNumber
) {
  const iface = new ethers.utils.Interface([
    "function transferFrom(address from, address to, uint256 value) external returns (bool)",
    "event Transfer(address indexed from, address indexed to, uint256 value)",
  ]);
  const contract = new ethers.Contract(contractAddress, iface, signer);
  const tx = await contract.transferFrom(from, to, value);
  const receipt = await tx.wait();
  for (const log of receipt.logs) {
    const mLog = iface.parseLog(log);
    if (mLog && mLog.name === "Transfer") {
      Logger.getInstance().info(
        `TransferFrom L3 successfully! Tx hash: ${tx.hash}`
      );
    }
  }
  return receipt;
}

export async function withdraw(
  parentOperator: Signer,
  parentWalletReceiver: string,
  childWalletSender: string,
  tokenAmount: BigNumber
): Promise<[boolean, string]> {
  try {
    const childProxy: Signer = new ethers.Wallet(PROXY_KEY, childProvider);
    const childOperator: Signer = new ethers.Wallet(
      OPERATOR_KEY,
      childProvider
    );

    const decimalsIface = new ethers.utils.Interface([
      "function decimals() public view virtual returns (uint8)",
    ]);
    const parentCustomToken = new ethers.Contract(
      childTokenAddr,
      decimalsIface,
      childProvider
    );

    const balanceERC20 = await balanceOfERC20(
      childTokenAddr,
      childWalletSender,
      childProvider
    );

    const tokenDecimals = await parentCustomToken.decimals();
    const tokenWithdrawAmount = ethers.BigNumber.from(tokenAmount).mul(
      ethers.BigNumber.from(10).pow(tokenDecimals)
    );

    if (tokenWithdrawAmount.gt(balanceERC20)) {
      throw new Error(
        `Insufficient Balance ${ethers.utils.formatUnits(
          tokenWithdrawAmount
        )} > ${ethers.utils.formatUnits(
          balanceERC20
        )} (Withdraw amount > Current balance) in L3`
      );
    }

    registerCustomArbitrumNetwork(customConduitNetwork);
    /**
     * Use childNetwork to create an Arbitrum SDK Erc20Bridger instance
     * We'll use Erc20Bridger for its convenience methods around transferring token to child and back to parent
     */

    const childNetwork = await getArbitrumNetwork(childProvider);
    const erc20Bridger = new Erc20Bridger(childNetwork);

    /**
     * Transfer token from a user to the oprator by proxy wallet of ChildToken contract in L3
     */

    const receiptTxFrom = await transferFrom(
      childTokenAddr,
      childProxy,
      childWalletSender,
      await childOperator.getAddress(),
      tokenWithdrawAmount
    );

    /**
     * ... Okay, Now we begin withdrawing DappToken from child. To withdraw, we'll use Erc20Bridger helper method withdraw
     * withdraw will call our child Gateway Router to initiate a withdrawal via the Standard ERC20 gateway
     * This transaction is constructed and paid for like any other child transaction (it just happens to (ultimately) make a call to ArbSys.sendTxToparent)
     * Arguments required are:
     * (1) amount: The amount of tokens to be transferred to parent
     * (2) erc20parentAddress: parent address of the ERC20 token
     * (3) childSigner: The child address transferring token to parent
     */
    Logger.getInstance().info("Withdrawing");
    const withdrawTx = await erc20Bridger.withdraw({
      amount: tokenWithdrawAmount,
      destinationAddress: parentWalletReceiver,
      erc20ParentAddress: parentTokenAddr,
      childSigner: childOperator,
    });

    const rec = await withdrawTx.wait();

    /**
     * First, let's find the Arbitrum txn from the txn hash provided
     */
    const txnHash = rec.transactionHash;
    const receipt = await childProvider.getTransactionReceipt(txnHash);
    const childReceipt = new ChildTransactionReceipt(receipt);

    /**
     * Note that in principle, a single transaction could trigger any number of outgoing messages; the common case will be there's only one.
     * For the sake of this script, we assume there's only one / just grad the first one.
     */
    const messages = await childReceipt.getChildToParentMessages(
      parentOperator
    );
    const childToParentMsg = messages[0];

    /**
     * before we try to execute out message, we need to make sure the child block it's included in is confirmed! (It can only be confirmed after the dispute period; Arbitrum is an optimistic rollup after-all)
     * waitUntilReadyToExecute() waits until the item outbox entry exists
     */
    const timeToWaitMs = 1000 * 60;
    Logger.getInstance().info(
      "Waiting for the outbox entry to be created. This only happens when the child block is confirmed on parent, ~1 week after it's creation."
    );
    const status =
      ChildToParentMessageStatus[
        await childToParentMsg.waitUntilReadyToExecute(
          childProvider,
          timeToWaitMs
        )
      ];
    Logger.getInstance().info("Outbox entry exists! Trying to execute now");

    Logger.getInstance().info(
      `To claim funds (after dispute period), see outbox-execute repo 🤞🏻`
    );

    return [
      true,
      JSON.stringify(
        {
          txHash: rec.transactionHash,
          childSigner: await childOperator.getAddress(),
          from: childWalletSender,
          to: parentWalletReceiver,
          amount: tokenWithdrawAmount,
          status: status,
          statusCode: StatusCodes.OK,
        },
        null,
        2
      ),
    ];
  } catch (e: any) {
    return [false, e.message];
  }
}

export async function claim(txHash: string, parentWallet: Signer) : Promise<[boolean, string]> {
    try {
        registerCustomArbitrumNetwork(customConduitNetwork)
    
        /**
             / * We start with a txn hash; we assume this is transaction that triggered an child to parent Message on child (i.e., ArbSys.sendTxToparent)
             */
        if (!txHash) {
          throw new Error(
            'Provide a transaction hash of an child transaction that sends an child to parent message'
          )
        }
        if (!txHash.startsWith('0x') || txHash.trim().length != 66) {
          throw new Error(`Hmm, ${txHash} doesn't look like a txn hash...`)
        }
    
        /**
         * First, let's find the Arbitrum txn from the txn hash provided
         */
        const receipt = await childProvider.getTransactionReceipt(txHash)
        const childReceipt = new ChildTransactionReceipt(receipt)
    
        /**
         * Note that in principle, a single transaction could trigger any number of outgoing messages; the common case will be there's only one.
         * For the sake of this script, we assume there's only one / just grad the first one.
         */
        const messages = await childReceipt.getChildToParentMessages(parentWallet)
        const childToParentMsg = messages[0]
    
        /**
         * Check if already executed
         */
        if (
          (await childToParentMsg.status(childProvider)) ===
          ChildToParentMessageStatus.EXECUTED
        ) {
          Logger.getInstance().info(`Message already executed! Nothing else to do here`)
        }
    
        /**
         * Now that its confirmed and not executed, we can execute our message in its outbox entry.
         */
        const res = await childToParentMsg.execute(childProvider)
        const rec = await res.wait()

        Logger.getInstance().info('Done! Your transaction is executed')
        return [true, JSON.stringify(
            {
              txHash: rec.transactionHash,
              from: rec.from,
              contract: rec.to,
              statusCode: StatusCodes.OK,
            },
            null,
            2
          )]
      } catch (e: any) {
        return [false, e.message]
      }
}
