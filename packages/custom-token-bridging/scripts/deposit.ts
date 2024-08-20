import dotenv from 'dotenv'
import { ethers, BigNumber, Signer } from 'ethers_v5'
import {
  getArbitrumNetwork,
  registerCustomArbitrumNetwork,
  Erc20Bridger,
  ParentToChildMessageStatus,
} from '@arbitrum/sdk'
import { StatusCodes } from 'http-status-codes'
import { customChildNetwork } from './config'

dotenv.config()

// Configuration
const parentProvider = new ethers.providers.JsonRpcProvider(
  process.env.PARENT_RPC
)
const childProvider = new ethers.providers.JsonRpcProvider(
  process.env.CHILD_RPC
)

async function deposit(
  parentWallet: Signer,
  tokenAmount: BigNumber,
  parentTokenAddr: string,
  beneficiary: string
) {
  // var status
  try {
    const decimalsIface = new ethers.utils.Interface([
      'function decimals() public view virtual returns (uint8)',
    ])
    registerCustomArbitrumNetwork(customChildNetwork)
    const parentCustomToken = new ethers.Contract(
      parentTokenAddr,
      decimalsIface,
      parentWallet
    )

    /**
     * Use arbitrumNetwork to create an Arbitrum SDK Erc20Bridger instance
     * We'll use Erc20Bridger for its convenience methods around transferring token to child
     */
    const arbitrumNetwork = await getArbitrumNetwork(childProvider)
    const erc20Bridger = new Erc20Bridger(arbitrumNetwork)

    /**
     * Because the token might have decimals, we update the amount to deposit taking into account those decimals
     */
    const tokenDecimals = await parentCustomToken.decimals()
    const tokenDepositAmount = tokenAmount.mul(
      ethers.BigNumber.from(10).pow(tokenDecimals)
    )
    const evtApprovalABI = [
      'event Approval(address indexed owner, address indexed spender, uint256 value)',
    ]
    const evtApprovalIF = new ethers.utils.Interface(evtApprovalABI)

    /**
     * The Standard Gateway contract will ultimately be making the token transfer call; thus, that's the contract we need to approve.
     * erc20Bridger.approveToken handles this approval
     * Arguments required are:
     * (1) parentSigner: The parent address transferring token to child
     * (2) erc20parentAddress: parent address of the ERC20 token to be depositted to child
     */
    console.log('Approving:')
    const approveTx = await erc20Bridger.approveToken({
      parentSigner: parentWallet,
      erc20ParentAddress: parentTokenAddr,
    })

    const approveRec = await approveTx.wait()
    var parseLogError,
      txHashDeposit: string = '',
      txHashApprove: string = ''

    for (const log of approveRec.logs) {
      try {
        const mLog = evtApprovalIF.parseLog({
          topics: log.topics,
          data: log.data,
        })
        if (mLog && mLog.name === 'Approval') {
          txHashApprove = approveTx.hash
          console.log(`Tx approve ${txHashApprove}`)
        }
      } catch (e) {
        parseLogError = e
        break
      }
    }
    if (parseLogError != undefined) {
      throw new Error(
        `Transaction Approve() was sent to chain with hash ${txHashApprove} but got error when getting log event: ${parseLogError}`
      )
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

    console.log('Transferring DappToken to child network:')
    const depositTx = await erc20Bridger.deposit({
      amount: tokenDepositAmount,
      destinationAddress: beneficiary,
      erc20ParentAddress: parentTokenAddr,
      parentSigner: parentWallet,
      childProvider: childProvider,
    })
    /**
     * Now we wait for parent and child side of transactions to be confirmed
     */
    console.log(
      `Deposit initiated: waiting for child network retryable (takes 10-15 minutes;current time: ${new Date().toTimeString()}) `
    )
    const depositRec = await depositTx.wait()
    const childResult = await depositRec.waitForChildTransactionReceipt(
      childProvider
    )
    txHashDeposit = childResult.message.retryableCreationId

    /**
     * The `complete` boolean tells us if the parent to child message was successful
     */

    // let status = ChildToParentMessageStatus[childResult.childTxReceipt.status]
    // console.log(await childResult.childTxReceipt.status)
    // console.log(childResult.status)
    let status = ParentToChildMessageStatus[childResult.status]
    if (childResult.complete === true) {
      return JSON.stringify(
        {
          txHash: txHashDeposit,
          parentWallet: await parentWallet.getAddress(),
          childWallet: beneficiary,
          amount: tokenDepositAmount,
          status: status,
          statusCode: StatusCodes.OK,
        },
        null,
        2
      )
    } else {
      throw new Error(
        `Deposit failed for child network retryable with status "${status}"`
      )
    }
  } catch (e) {
    return JSON.stringify(
      {
        message: `Error when depositing token with reason: ${e}`,
        // status: status,
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      },
      null,
      2
    )
  }
}

async function main() {
  const parentTokenAddr: string = String(process.env.PARENT_TOKEN)
  const depositAmount = ethers.BigNumber.from(parseInt(String(process.env.DEPOSIT_AMOUNT)))

  // Test environment
  const CHILD_WALLET_KEY: string = String(process.env.CHILD_WALLET_KEY)
  const PARENT_WALLET_KEY: string = String(process.env.PARENT_WALLET_KEY)

  const parentWallet: Signer = new ethers.Wallet(
    PARENT_WALLET_KEY,
    parentProvider
  )

  const childWallet: Signer = new ethers.Wallet(CHILD_WALLET_KEY, childProvider)

  const res1 = await deposit(
    parentWallet,
    depositAmount,
    parentTokenAddr,
    await childWallet.getAddress()
  )
  console.log(res1)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
