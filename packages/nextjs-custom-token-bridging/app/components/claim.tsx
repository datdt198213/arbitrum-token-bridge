"use client";

import { BigNumber } from "ethers";
import { claim } from "@/token-bridge/claim";
import { useEthersSigner } from "@/lib/convertSigner";
import { useEffect, useState } from "react";

export function Claim() {
  const signer = useEthersSigner();
  const [txHash, setTxHash] = useState<string>("");
  const [status, setStatus] = useState<string>("");

  const handleClaim = async () => {
    setStatus("")
    const [success, message] = await claim(
        txHash,
        signer,
    );
    setStatus(success ? `Claim successful! ${message}` : `Claim failed: ${message}`);
  };
  
  return (
    <div>
      <div>
        <label>
          Transaction hash
          <input
            type="text"
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
            placeholder="Enter transaction hash"
          />
        </label>
      </div>
      <button onClick={handleClaim}>Claim</button>
      {status && <p>{status}</p>}
    </div>
  );
}