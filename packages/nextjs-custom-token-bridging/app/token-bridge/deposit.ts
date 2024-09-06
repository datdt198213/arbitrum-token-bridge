import { Provider } from "@ethersproject/providers";
import { Signer, BigNumber, ethers } from "ethers";
import {
  registerCustomArbitrumNetwork,
  ParentToChildMessageStatus,
  EthBridger
} from "@arbitrum/sdk";
import { approve, checkBalanceERC20, getDecimals, percentIncrease } from "@/lib/utils";

import { parentTokenAddr, childNetwork } from "@/lib/utils";
import { childProvider, parentProvider } from "@/lib/utils";

export async function deposit(
  parentSigner: Signer,
  amount: string,
  beneficiary: string
): Promise<[boolean, string]> {
  // var status
  try {
    const parentWallet: string = await parentSigner.getAddress();
    registerCustomArbitrumNetwork(childNetwork);

    /**
     * Use childProvider to get an Arbitrum SDK Erc20Bridger instance
     * We'll use Erc20Bridger for its convenience methods around transferring token to child
     */
    const ethBridger = await EthBridger.fromProvider(childProvider);
    
    /**
     * Because the token might have decimals, we update the amount to deposit taking into account those decimals
     */
    const tokenDepositAmount = await getDecimals(
        parentTokenAddr,
        parentProvider,
        amount
      );
    
    /**
     * Check balance of wallet in L2
     */
        await checkBalanceERC20(
            parentTokenAddr,
            parentWallet,
            parentProvider,
            tokenDepositAmount
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
    const inbox = childNetwork.ethBridge.inbox;
    const approval = await approve(parentTokenAddr, parentSigner, inbox, tokenDepositAmount);
    // const approveTx = await erc20Bridger.approveToken({
    //   parentSigner: parentSigner,
    //   erc20ParentAddress: parentTokenAddr,
    // });
    var txHashDeposit: string = "";

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


    const depositRequest = await ethBridger.getDepositRequest({
        amount: tokenDepositAmount,
        from: parentWallet
      })
  
      const gasLimit = await parentProvider.estimateGas(
        depositRequest.txRequest
      )
  
      const sourceChainTransaction = await ethBridger.deposit({
        amount: tokenDepositAmount,
        parentSigner: parentSigner,
        overrides: { gasLimit: percentIncrease(gasLimit, BigNumber.from(5)) }
      })

    // const depositRequest = await erc20Bridger.getDepositRequest({
    //   parentProvider: parentProvider,
    //   childProvider: childProvider,
    //   from: parentWallet,
    //   erc20ParentAddress: parentTokenAddr,
    //   destinationAddress: beneficiary,
    //   amount: tokenDepositAmount,
    // //   retryableGasOverrides: {
    //     // the gas limit may vary by about 20k due to SSTORE (zero vs nonzero)
    //     // the 30% gas limit increase should cover the difference
    //     // gasLimit: { percentIncrease: BigNumber.from(30) },
    // //   },
    // });

    // const gasLimit = await parentProvider.estimateGas(depositRequest.txRequest);

    // const sourceChainTransaction = await erc20Bridger.deposit({
    //   ...depositRequest,
    //   parentSigner: parentSigner,
    //   childProvider: childProvider,
    //   overrides: { gasLimit: percentIncrease(gasLimit, BigNumber.from(5)) },
    // });

    /**
     * Now we wait for parent and child side of transactions to be confirmed
     */

    console.log(
      `Deposit initiated: waiting for child network retryable (takes 10-15 minutes; current time: ${new Date().toTimeString()})`
    );
    const depositRec = await sourceChainTransaction.wait();
    const childResult = await depositRec.waitForChildTransactionReceipt(
      childProvider
    );
    // txHashDeposit = childResult.message.retryableCreationId;

    /**
     * The `complete` boolean tells us if the parent to child message was successful
     */

    // let status = ParentToChildMessageStatus[childResult.status];
    if (childResult.complete === true) {
      return [
        true,
        JSON.stringify(
          {
            txHash: txHashDeposit,
            parentWallet: parentWallet,
            childWallet: beneficiary,
            amount: tokenDepositAmount,
          },
          null,
          2
        ),
      ];
    } else {
      throw new Error(
        // `Failed for child network retryable with status "${status}"`
      );
    }
  } catch (e: any) {
    return [false, e.message];
  }
}
