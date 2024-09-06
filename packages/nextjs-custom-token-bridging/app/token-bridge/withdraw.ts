import { Signer, BigNumber, ethers } from "ethers";
import {
  registerCustomArbitrumNetwork,
  EthBridger,
  ChildTransactionReceipt,
  ChildToParentMessageStatus,
} from "@arbitrum/sdk";
import { PROXY_KEY, OPERATOR_KEY } from "@/config/constant";

import {
  parentProvider,
  parentTokenAddr,
  childProvider,
  childNetwork,
  percentIncrease,
} from "@/lib/utils";

export async function withdraw(
  parentSigner: Signer,
  parentReceiver: string,
  tokenAmount: string
): Promise<[boolean, string]> {
  try {
    const childOperator: Signer = new ethers.Wallet(
      OPERATOR_KEY,
      childProvider
    );
    const parentWallet = await parentSigner.getAddress();
    const DECIMALS = 18
    const tokenWithdrawAmount = BigNumber.from(tokenAmount).mul(10).pow(DECIMALS);
    const balance = await childProvider.getBalance(parentWallet);
    
    /**
     * Check balance of wallet in L3
     */
    if (tokenWithdrawAmount > balance) {
        throw new Error(
            `Insufficient Balance ${ethers.utils.formatUnits(
              tokenWithdrawAmount)} > ${ethers.utils.formatUnits(balance)}`
          );
    }

    registerCustomArbitrumNetwork(childNetwork);
    /**
     * Use childNetwork to create an Arbitrum SDK Erc20Bridger instance
     * We'll use Erc20Bridger for its convenience methods around transferring token to child and back to parent
     */

    const ethBridger = await EthBridger.fromProvider(childProvider);

    /**
     * ... Okay, Now we begin withdrawing DappToken from child. To withdraw, We'll start by creating a request using the getWithdrawalRequest method from the Erc20Bridger helper. After that, we'll use the withdraw method from the same helper.
     * withdraw will call our child Gateway Router to initiate a withdrawal via the Standard ERC20 gateway
     * This transaction is constructed and paid for like any other child transaction (it just happens to (ultimately) make a call to ArbSys.sendTxToparent)
     * Arguments required are:
     * (1) from: the wallet address of child chain transferring token to parent
     * (2) destinationAddress: the beneficiary wallet of parent chain is received ERC20 token
     * (3) erc20parentAddress: address of the ERC20 token in parent chain
     * (4) amount: The amount of tokens to be transferred to parent
     * (5) childSigner: The child signer transferring token to parent (same wallet of from argument(1))
     */

    const request = await ethBridger.getWithdrawalRequest({
        amount: tokenWithdrawAmount,
        destinationAddress: parentReceiver,
        from: await parentSigner.getAddress()
      })
  
      const tx = await ethBridger.withdraw({
        ...request,
        childSigner: childOperator,
        overrides: {
          gasLimit: percentIncrease(
            await childProvider.estimateGas(request.txRequest),
            BigNumber.from(30)
          )
        }
      })

    /**
     * First, let's find the Arbitrum txn from the txn hash provided
     */
    console.log(`Withdraw Tx hash: ${tx.hash}`);
    const receipt = await childProvider.getTransactionReceipt(tx.hash);
    const childReceipt = new ChildTransactionReceipt(receipt);

    /**
     * Note that in principle, a single transaction could trigger any number of outgoing messages; the common case will be there's only one.
     * For the sake of this script, we assume there's only one / just grad the first one.
     */
    const messages = await childReceipt.getChildToParentMessages(
      parentProvider
    );
    const childToParentMsg = messages[0];

    /**
     * before we try to execute out message, we need to make sure the child block it's included in is confirmed! (It can only be confirmed after the dispute period; Arbitrum is an optimistic rollup after-all)
     * waitUntilReadyToExecute() waits until the item outbox entry exists
     */
    const timeToWaitMs = 1000 * 60;
    console.log(
      "Waiting for the outbox entry to be created. This only happens when the child block is confirmed on parent, ~1 week after it's creation."
    );
    const status =
      ChildToParentMessageStatus[
        await childToParentMsg.waitUntilReadyToExecute(
          childProvider,
          timeToWaitMs
        )
      ];
    console.log("Outbox entry exists! Trying to execute now");

    console.log(
      `To claim funds (after dispute period), see outbox-execute repo 🤞🏻`
    );

    return [
      true,
      JSON.stringify(
        {
          txHash: tx.hash,
          childSigner: await childOperator.getAddress(),
          from: await childOperator.getAddress(),
          to: parentWallet,
          amount: tokenWithdrawAmount,
          status: status,
        },
        null,
        2
      ),
    ];
  } catch (e: any) {
    return [false, `Withdraw failed: ${e.message}`];
  }
}