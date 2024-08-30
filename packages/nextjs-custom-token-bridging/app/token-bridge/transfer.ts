import {
  childProvider,
  childTokenAddr,
  checkBalanceERC20,
  PROXY_KEY,
  transferFrom,
} from "./utils";
import { BigNumber, ethers, Signer } from "ethers";

export async function transfer(sender: Signer, to: string, amount: BigNumber) {
  try {
    const senderAddress = await sender.getAddress();

    // Check balance of sender wallet in L3
    await checkBalanceERC20(
      childTokenAddr,
      senderAddress,
      childProvider,
      amount
    );

    const proxy = new ethers.Wallet(PROXY_KEY, childProvider);
    return [
      true,
      await transferFrom(childTokenAddr, proxy, senderAddress, to, amount),
    ];
  } catch (err) {
    return [false, err.message];
  }
}
