"use client";

import { BigNumber } from "ethers";
import { withdraw, withdrawSelf } from "@/token-bridge/withdraw";
import { useEthersSigner } from "@/lib/convertSigner";
import { useEffect, useState } from "react";

export function Withdraw() {
  const signer = useEthersSigner();
  const [amount, setAmount] = useState<string>("");
  const [l3Wallet, setL3Wallet] = useState<string>("");
  const [status, setStatus] = useState<string>("");

  const handleWithdraw = async () => {
    setStatus("")
    const [success, message] = await withdraw(
      signer,
      l3Wallet,
      BigNumber.from(amount)
    );
    setStatus(success ? "Withdraw successful" : `${message}`);
  };

  const handleWithdrawSelf = async () => {
    setStatus("")
    const [success, message] = await withdrawSelf(
      signer,
      BigNumber.from(amount)
    );
    setStatus(success ? "Withdraw successful" : `${message}`);
  };
  
  return (
    <div>
      <div>
        <label>
          Amount:
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
          />
        </label>
      </div>
      <div>
        <label>
          Destination Address:
          <input
            type="text"
            value={l3Wallet}
            onChange={(e) => setL3Wallet(e.target.value)}
            placeholder="Enter destination address"
          />
        </label>
      </div>
      <button onClick={handleWithdraw}>Withdraw</button>
      <button onClick={handleWithdrawSelf}>Withdraw Self</button>
      {status && <p>{status}</p>}
    </div>
  );
}