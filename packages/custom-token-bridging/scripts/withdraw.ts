import dotenv from 'dotenv'
import { ethers, BigNumber, Signer } from 'ethers_v5'
import {
  getArbitrumNetwork,
  registerCustomArbitrumNetwork,
  Erc20Bridger,
  ChildTransactionReceipt,
  ChildToParentMessageStatus,
} from '@arbitrum/sdk'
import { StatusCodes } from 'http-status-codes'
import { customChildNetwork } from './config'
dotenv.config()

const parentProvider = new ethers.providers.JsonRpcProvider(
  process.env.PARENT_RPC
)
const childProvider = new ethers.providers.JsonRpcProvider(
  process.env.CHILD_RPC
)

async function transferFrom(
  contractAddress: string,
  signer: Signer,
  from: string,
  to: string,
  value: BigNumber
) {
  const iface = new ethers.utils.Interface([
    'function transferFrom(address from, address to, uint256 value) external returns (bool)',
  ])

  const contract = new ethers.Contract(contractAddress, iface, signer)
  const tx = await contract.connect(signer).transferFrom(from, to, value)
  const receipt = await tx.wait()
  return receipt
}

async function withdraw(
  parentOperator: Signer,
  childOperator: Signer,
  childProxy: Signer,
  parentWalletReceiver: string,
  childWalletSender: string,
  parentTokenAddr: string,
  childTokenAddr: string,
  tokenAmount: BigNumber
) {
  try {
    const decimalsIface = new ethers.utils.Interface([
      'function decimals() public view virtual returns (uint8)',
    ])
    registerCustomArbitrumNetwork(customChildNetwork)
    const parentCustomToken = new ethers.Contract(
      childTokenAddr,
      decimalsIface,
      childOperator
    )

    /**
     * Use childNetwork to create an Arbitrum SDK Erc20Bridger instance
     * We'll use Erc20Bridger for its convenience methods around transferring token to child and back to parent
     */

    const childNetwork = await getArbitrumNetwork(childProvider)
    const erc20Bridger = new Erc20Bridger(childNetwork)

    const tokenDecimals = await parentCustomToken.decimals()
    const tokenWithdrawAmount = tokenAmount.mul(
      ethers.BigNumber.from(10).pow(tokenDecimals)
    )
    /**
     * Transfer token from user to oprator by proxy in L3
     */
    const receiptTxFrom = await transferFrom(
      childTokenAddr,
      childProxy,
      childWalletSender,
      await childOperator.getAddress(),
      tokenWithdrawAmount
    )
    console.log(`Tx hash transfer token: ${receiptTxFrom.transactionHash}`)

    /**
     * ... Okay, Now we begin withdrawing DappToken from child. To withdraw, we'll use Erc20Bridger helper method withdraw
     * withdraw will call our child Gateway Router to initiate a withdrawal via the Standard ERC20 gateway
     * This transaction is constructed and paid for like any other child transaction (it just happens to (ultimately) make a call to ArbSys.sendTxToparent)
     * Arguments required are:
     * (1) amount: The amount of tokens to be transferred to parent
     * (2) erc20parentAddress: parent address of the ERC20 token
     * (3) childSigner: The child address transferring token to parent
     */
    console.log('Withdrawing...')
    const withdrawTx = await erc20Bridger.withdraw({
      amount: tokenWithdrawAmount,
      destinationAddress: parentWalletReceiver,
      erc20ParentAddress: parentTokenAddr,
      childSigner: childOperator,
    })

    const rec = await withdrawTx.wait()

    /**
     * First, let's find the Arbitrum txn from the txn hash provided
     */
    const txnHash = rec.transactionHash
    const receipt = await childProvider.getTransactionReceipt(txnHash)
    const childReceipt = new ChildTransactionReceipt(receipt)

    /**
     * Note that in principle, a single transaction could trigger any number of outgoing messages; the common case will be there's only one.
     * For the sake of this script, we assume there's only one / just grad the first one.
     */
    const messages = await childReceipt.getChildToParentMessages(parentOperator)
    const childToParentMsg = messages[0]

    /**
     * before we try to execute out message, we need to make sure the child block it's included in is confirmed! (It can only be confirmed after the dispute period; Arbitrum is an optimistic rollup after-all)
     * waitUntilReadyToExecute() waits until the item outbox entry exists
     */
    const timeToWaitMs = 1000 * 60
    console.log(
      "Waiting for the outbox entry to be created. This only happens when the child block is confirmed on parent, ~1 week after it's creation."
    )
    const status =
      ChildToParentMessageStatus[
        await childToParentMsg.waitUntilReadyToExecute(
          childProvider,
          timeToWaitMs
        )
      ]
    console.log('Outbox entry exists! Trying to execute now')

    console.log(
      `To claim funds (after dispute period), see outbox-execute repo 🤞🏻`
    )

    return JSON.stringify(
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
    )
  } catch (e) {
    return JSON.stringify(
      {
        message: `Error when withdrawing token with reason ${e}`,
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      },
      null,
      2
    )
  }
}

async function main() {
  const parentTokenAddr: string = String(process.env.PARENT_TOKEN)
  const childTokenAddr: string = String(process.env.CHILD_TOKEN)

  const withdrawAmount = ethers.BigNumber.from(parseInt(String(process.env.WITHDRAW_AMOUNT)));

  // Test environment
  const OPERATOR_KEY: string = String(process.env.OPERATOR_KEY)
  const PROXY_KEY: string = String(process.env.PROXY_KEY)
  const PARENT_WALLET_KEY: string = String(process.env.PARENT_WALLET_KEY)
  const CHILD_WALLET_KEY: string = String(process.env.CHILD_WALLET_KEY)

  const parentOperator: ethers.Signer = new ethers.Wallet(
    OPERATOR_KEY,
    parentProvider
  )
  const childProxy: Signer = new ethers.Wallet(PROXY_KEY, childProvider)
  const childOperator: Signer = new ethers.Wallet(OPERATOR_KEY, childProvider)

  const parentBeneficiary: Signer = new ethers.Wallet(
    PARENT_WALLET_KEY,
    parentProvider
  )
  const childBeneficiary: Signer = new ethers.Wallet(
    CHILD_WALLET_KEY,
    childProvider
  )

  const res2 = await withdraw(
    parentOperator,
    childOperator,
    childProxy,
    await parentBeneficiary.getAddress(),
    await childBeneficiary.getAddress(),
    parentTokenAddr,
    childTokenAddr,
    withdrawAmount
  )
  console.log(res2)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
