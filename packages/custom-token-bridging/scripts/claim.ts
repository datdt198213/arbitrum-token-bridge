import * as dotenv from 'dotenv'
import { ethers, Signer } from 'ethers_v5'
import {
  registerCustomArbitrumNetwork,
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

async function claim(txHash: string, parentWallet: Signer) {
  try {
    registerCustomArbitrumNetwork(customChildNetwork)

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
      console.log(`Message already executed! Nothing else to do here`)
    }

    /**
     * Now that its confirmed and not executed, we can execute our message in its outbox entry.
     */
    const res = await childToParentMsg.execute(childProvider)
    const rec = await res.wait()
    // console.log(rec)
    console.log('Done! Your transaction is executed')
    return JSON.stringify(
      {
        txHash: rec.transactionHash,
        from: rec.from,
        contract: rec.to,
        statusCode: StatusCodes.OK,
      },
      null,
      2
    )
  } catch (e) {
    return JSON.stringify(
      {
        message: `Error when claiming token with reason ${e}`,
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
      },
      null,
      2
    )
  }
}

async function main() {
  // Test environment
  const OPERATOR_KEY: string = String(process.env.OPERATOR_KEY)
  const PARENT_WALLET_KEY: string = String(process.env.PARENT_WALLET_KEY)

  const parentOperator: ethers.Signer = new ethers.Wallet(
    OPERATOR_KEY,
    parentProvider
  )

  const parentWallet: ethers.Signer = new ethers.Wallet(
    PARENT_WALLET_KEY,
    parentProvider
  )

  const txHash: string = String(process.env.WITHDRAW_HASH)
  const res3 = await claim(txHash, parentWallet)
  console.log(res3)
}

main()
