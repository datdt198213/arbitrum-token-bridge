"use client";

import { BigNumber } from "ethers";
import { balanceOfERC20, childProvider } from "@/token-bridge/utils";
import { useEthersSigner } from "@/lib/convertSigner";
import { useEffect, useState } from "react";

export function BalanceOf() {
  const signer = useEthersSigner();
  const [contract, setContract] = useState<string>("");
  const [account, setAccount] = useState<string>("");
  const [status, setStatus] = useState<string>("");

  const handleBalance = async () => {
    setStatus("")
    const message = await balanceOfERC20(
        contract, account, childProvider
    );
    setStatus(`Balance successful! ${message}`);
  };
  
  return (
    <div>
      <div>
        <label>
          Contract
          <input
            type="text"
            value={contract}
            onChange={(e) => setContract(e.target.value)}
            placeholder="Enter Contract"
          />
        </label>
      </div>
      <div>
        <label>
          Address
          <input
            type="text"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            placeholder="Enter address"
          />
        </label>
      </div>
      <button onClick={handleBalance}>Balance Of</button>
      {status && <p>{status}</p>}
    </div>
  );
}