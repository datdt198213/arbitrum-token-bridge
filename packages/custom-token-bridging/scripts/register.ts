import dotenv from 'dotenv'
import { ethers } from 'ethers_v5'

import {
  getArbitrumNetwork,
  registerCustomArbitrumNetwork,
  ParentToChildMessageStatus,
} from '@arbitrum/sdk'
import { AdminErc20Bridger } from '@arbitrum/sdk/dist/lib/assetBridger/erc20Bridger'
import { customConduitNetwork } from './config'
dotenv.config()

const main = async () => {
  /**
   * Set up: instantiate L1 / L2 wallets connected to providers
   */
  const OPERATOR_KEY: string = String(process.env.OPERATOR_KEY)
  const parentProvider = new ethers.providers.JsonRpcProvider(
    process.env.PARENT_RPC
  )
  const childProvider = new ethers.providers.JsonRpcProvider(
    process.env.CHILD_RPC
  )

  const parentOperator = new ethers.Wallet(OPERATOR_KEY, parentProvider)

  registerCustomArbitrumNetwork(customConduitNetwork)

  /**
   * Use childNetwork to create an Arbitrum SDK AdminErc20Bridger instance
   * We'll use AdminErc20Bridger for its convenience methods around registering tokens to the custom gateway
   */
  const childNetwork = await getArbitrumNetwork(childProvider)
  const adminTokenBridger = new AdminErc20Bridger(childNetwork)

  const parentTokenAddr: string = String(process.env.PARENT_TOKEN)
  const childTokenAddr: string = String(process.env.CHILD_TOKEN)

  /**
   * Register custom token on our custom gateway
   */
  console.log('Registering custom token on L2:')
  const registerTokenTx = await adminTokenBridger.registerCustomToken(
    parentTokenAddr,
    childTokenAddr,
    parentOperator,
    childProvider
  )

  const registerTokenRec = await registerTokenTx.wait()
  console.log(
    `Registering token txn confirmed on L1! 🙌 L1 receipt is: ${registerTokenRec.transactionHash}`
  )

  /**
   * The L1 side is confirmed; now we listen and wait for the L2 side to be executed; we can do this by computing the expected txn hash of the L2 transaction.
   * To compute this txn hash, we need our message's "sequence numbers", unique identifiers of each L1 to L2 message.
   * We'll fetch them from the event logs with a helper method.
   */
  const l1ToL2Msgs = await registerTokenRec.getParentToChildMessages(
    childProvider
  )

  /**
   * In principle, a single L1 txn can trigger any number of L1-to-L2 messages (each with its own sequencer number).
   * In this case, the registerTokenOnL2 method created 2 L1-to-L2 messages;
   * - (1) one to set the L1 token to the Custom Gateway via the Router, and
   * - (2) another to set the L1 token to its L2 token address via the Generic-Custom Gateway
   * Here, We check if both messages are redeemed on L2
   */
  // expect(l1ToL2Msgs.length, 'Should be 2 messages.').to.eq(2)
  if (l1ToL2Msgs.length !== 2) {
    console.log('Should be 2 messages.')
  }

  const setTokenTx = await l1ToL2Msgs[0].waitForStatus()
  if (setTokenTx.status !== ParentToChildMessageStatus.REDEEMED) {
    console.log('Set token not redeemed.')
  }

  // expect(setTokenTx.status, 'Set token not redeemed.').to.eq(
  // ParentToChildMessageStatus.REDEEMED
  // )

  const setGateways = await l1ToL2Msgs[1].waitForStatus()
  if (setGateways.status !== ParentToChildMessageStatus.REDEEMED) {
    console.log('Set gateways not redeemed.')
  }

  // expect(setGateways.status, 'Set gateways not redeemed.').to.eq(
  // ParentToChildMessageStatus.REDEEMED
  // )

  console.log(
    'Your custom token is now registered on our custom gateway 🥳  Go ahead and make the deposit!'
  )
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })