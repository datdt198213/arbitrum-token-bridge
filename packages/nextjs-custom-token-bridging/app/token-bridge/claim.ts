import { customConduitNetwork } from "@/config/network";
import {
  getArbitrumNetwork,
  registerCustomArbitrumNetwork,
  ParentToChildMessageStatus,
  Erc20Bridger,
  ChildTransactionReceipt,
  ChildToParentMessageStatus,
} from "@arbitrum/sdk";
import { Signer, ethers } from "ethers";
import { childProvider, parentProvider, parentTokenAddr } from "./utils";

export async function claim(
  txHash: string,
  parentWallet: Signer
): Promise<[boolean, string]> {
  try {
    registerCustomArbitrumNetwork(customConduitNetwork);

    /**
             / * We start with a txn hash; we assume this is transaction that triggered an child to parent Message on child (i.e., ArbSys.sendTxToparent)
             */
    if (!txHash) {
      throw new Error(
        "Provide a transaction hash of an child transaction that sends an child to parent message"
      );
    }
    if (!txHash.startsWith("0x") || txHash.trim().length != 66) {
      throw new Error(`Hmm, ${txHash} doesn't look like a txn hash...`);
    }

    /**
     * First, let's find the Arbitrum txn from the txn hash provided
     */
    const receipt = await childProvider.getTransactionReceipt(txHash);
    const childReceipt = new ChildTransactionReceipt(receipt);
    /**
     * Note that in principle, a single transaction could trigger any number of outgoing messages; the common case will be there's only one.
     * For the sake of this script, we assume there's only one / just grad the first one.
     */
    const messages = await childReceipt.getChildToParentMessages(parentWallet);
    const childToParentMsg = messages[0];

    /**
     * Check if already executed
     */
    if (
      (await childToParentMsg.status(childProvider)) ===
      ChildToParentMessageStatus.EXECUTED
    ) {
      console.log(`Message already executed! Nothing else to do here`);
    }

    /**
     * Now that its confirmed and not executed, we can execute our message in its outbox entry.
     */
    const res = await childToParentMsg.execute(childProvider);
    const rec = await res.wait();

    const iface = new ethers.utils.Interface([
      "event Transfer(address indexed from, address indexed to, uint256 value)",
    ]);
    for (const log of receipt.logs) {
      const mLog = iface.parseLog(log);
      if (mLog && mLog.name === "Transfer") {
      }
    }

    console.log("Done! Your transaction is executed");
    console.log(rec);

    return [
      true,
      JSON.stringify(
        {
          txHash: rec.transactionHash,
          from: rec.from,
        },
        null,
        2
      ),
    ];
  } catch (e: any) {
    return [false, e.message];
  }
}
