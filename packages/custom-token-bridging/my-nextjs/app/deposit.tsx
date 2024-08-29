"use client";

import { BigNumber } from "ethers";
import { deposit } from "@/token-bridge-sdk/deposit";
import { useEthersSigner } from "@/token-bridge-sdk/utils";
import { useEffect, useState } from "react";

export function Deposit() {
  const signer = useEthersSigner();
  const [amount, setAmount] = useState<string>("");
  const [destinationAddress, setDestinationAddress] = useState<string>("");
  const [status, setStatus] = useState<string>("");

  const handleDeposit = async () => {
    setStatus("")
    const [success, message] = await deposit(
      signer,
      BigNumber.from(amount),
      destinationAddress
    );
    setStatus(success ? "Deposit successful" : `Deposit failed: ${message}`);
  };
  // "1", "0x8c3AE5DbE2900bfBA1Bdb7606D93a96362b0DB33"
  
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
            value={destinationAddress}
            onChange={(e) => setDestinationAddress(e.target.value)}
            placeholder="Enter destination address"
          />
        </label>
      </div>
      <button onClick={() => handleDeposit()}>Deposit</button>
      {status && <p>{status}</p>}
    </div>
  );
}