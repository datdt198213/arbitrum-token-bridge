"use client";

import { BigNumber } from "ethers";
import { transfer } from "@/token-bridge/transfer";
import { useEthersSigner } from "@/lib/convertSigner";
import { useEffect, useState } from "react";

export function Transfer() {
  const signer = useEthersSigner();
  const [amount, setAmount] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [status, setStatus] = useState<string>("");

  const handleTransfer = async () => {
    setStatus("")
    const [success, message] = await transfer(signer, to, BigNumber.from(amount)
    );
    setStatus(success ? `Transfer successful! ${message}` : `Transfer failed: ${message}`);
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
          Receiver
          <input
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="Receiver"
          />
        </label>
      </div>
      <button onClick={handleTransfer}>Transfer</button>
      {status && <p>{status}</p>}
    </div>
  );
}