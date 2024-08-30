import { providers, BigNumber, Contract } from 'ethers'

export const parentTokenAddr: string = "0xe7eEB65afd58e465Fc4986C8f71a5670381525Ad";
export const childTokenAddr: string = "0x4ae4a5b28fF12274727a1798a3BCDd493A19287C";
export const CHILD_RPC: string = "https://rpc-pmtest-6lw45cjbgl.t.conduit.xyz";
export const PARENT_RPC: string = "https://sepolia-rollup.arbitrum.io/rpc";
export const childProvider = new providers.JsonRpcProvider(CHILD_RPC);
export const parentProvider = new providers.JsonRpcProvider(PARENT_RPC);
export const OPERATOR_KEY: string = "0xf70920bc474b73aa90bff0d7ac295cd840b72375aeea12b20ff88460dac80f53"
export const PROXY_KEY: string = "0x99b0eb9ce810284e3b7269b2f5fb16679d2062a931a791c191f4035e3f807cd2"

export async function balanceOfERC20(
    contractAddress: string,
    account: string,
    provider: any
  ) {
    const abi = [
      "function balanceOf(address account) external view returns (uint256)",
    ];
    const contract = new Contract(contractAddress, abi, provider);
    const balanceERC20 = await contract.balanceOf(account);
    return balanceERC20;
}  



export function percentIncrease(
    num: BigNumber,
    increase: BigNumber
  ): BigNumber {
    return num.add(num.mul(increase).div(100))
  }