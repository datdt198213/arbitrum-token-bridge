import { Provider } from "@ethersproject/providers";
import { Signer, BigNumber, Contract, ethers } from "ethers";
import {
  getArbitrumNetwork,
  registerCustomArbitrumNetwork,
  ParentToChildMessageStatus,
  Erc20Bridger,
} from "@arbitrum/sdk";
import { percentIncrease } from "@/token-bridge/utils";
import { customConduitNetwork } from "@/config/network";
import { balanceOfERC20 } from "@/token-bridge/utils";

// const parentTokenAddr: string = String(process.env.PARENT_TOKEN);
// const childTokenAddr: string = String(process.env.CHILD_TOKEN);
// const CHILD_RPC: string = String(process.env.CHILD_RPC);
// const PARENT_RPC: string = String(process.env.PARENT_RPC);
// const childProvider = new ethers.providers.JsonRpcProvider(CHILD_RPC);
// const parentProvider = new ethers.providers.JsonRpcProvider(PARENT_RPC);
// const OPERATOR_KEY: string = String(process.env.OPERATOR_KEY);
// const PROXY_KEY: string = String(process.env.PROXY_KEY);

const parentTokenAddr: string = "0xe7eEB65afd58e465Fc4986C8f71a5670381525Ad";
const childTokenAddr: string = "0x4ae4a5b28fF12274727a1798a3BCDd493A19287C";
const CHILD_RPC: string = "https://rpc-pmtest-6lw45cjbgl.t.conduit.xyz";
const PARENT_RPC: string = "https://sepolia-rollup.arbitrum.io/rpc";
const childProvider = new ethers.providers.JsonRpcProvider(CHILD_RPC);
const parentProvider = new ethers.providers.JsonRpcProvider(PARENT_RPC);
const OPERATOR_KEY: string =
  "0xf70920bc474b73aa90bff0d7ac295cd840b72375aeea12b20ff88460dac80f53";
const PROXY_KEY: string =
  "0x99b0eb9ce810284e3b7269b2f5fb16679d2062a931a791c191f4035e3f807cd2";

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
    const tokenDepositAmount = tokenAmount.mul(
      ethers.BigNumber.from(10).pow(tokenDecimals)
    );

    if (tokenDepositAmount.gt(balanceERC20)) {
      throw new Error(
        `Insufficient Balance ${ethers.utils.formatUnits(
          tokenDepositAmount
        )} > ${ethers.utils.formatUnits(
          balanceERC20
        )}`
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
          console.log(`Approve successfully! Tx approve ${txHashApprove}`);
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

    const depositRequest = await erc20Bridger.getDepositRequest({
      parentProvider: parentProvider,
      childProvider: childProvider,
      from: await parentWallet.getAddress(),
      erc20ParentAddress: parentTokenAddr,
      destinationAddress: beneficiary,
      amount: tokenDepositAmount,
      retryableGasOverrides: {
        // the gas limit may vary by about 20k due to SSTORE (zero vs nonzero)
        // the 30% gas limit increase should cover the difference
        gasLimit: { percentIncrease: BigNumber.from(30) },
      },
    });

    const gasLimit = await parentProvider.estimateGas(depositRequest.txRequest);

    const sourceChainTransaction = await erc20Bridger.deposit({
      ...depositRequest,
      parentSigner: parentWallet,
      childProvider: childProvider,
      overrides: { gasLimit: percentIncrease(gasLimit, BigNumber.from(5)) },
    });

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
            amount: ethers.utils.formatUnits(tokenDepositAmount, tokenDecimals),
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
