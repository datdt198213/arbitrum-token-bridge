import { Erc20Bridger } from '@arbitrum/sdk'
import { BigNumber, constants, ethers, Signer } from 'ethers'
import { ERC20__factory } from '@arbitrum/sdk/dist/lib/abi/factories/ERC20__factory'
import {
  ApproveTokenProps,
  BridgeTransferStarter,
  BridgeTransferStarterProps,
  RequiresTokenApprovalProps,
  TransferEstimateGas,
  TransferProps,
  TransferFromProps,
  TransferType
} from './BridgeTransferStarter'
import {
  fetchErc20L2GatewayAddress,
  getL1ERC20Address
} from '../util/TokenUtils'
import {
  getAddressFromSigner,
  getChainIdFromProvider,
  percentIncrease
} from './utils'
import { tokenRequiresApprovalOnL2 } from '../util/L2ApprovalUtils'
import { withdrawInitTxEstimateGas } from '../util/WithdrawalUtils'
import { addressIsSmartContract } from '../util/AddressUtils'

export class Erc20WithdrawalStarter extends BridgeTransferStarter {
  public transferType: TransferType = 'erc20_withdrawal'

  private sourceChainGatewayAddress: string | undefined

  constructor(props: BridgeTransferStarterProps) {
    super(props)

    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }
  }

  private async getSourceChainGatewayAddress(): Promise<string> {
    const destinationChainErc20Address =
      await this.getDestinationChainErc20Address()

    const sourceChainGatewayAddress = await fetchErc20L2GatewayAddress({
      erc20L1Address: destinationChainErc20Address,
      l2Provider: this.sourceChainProvider
    })

    this.sourceChainGatewayAddress = sourceChainGatewayAddress

    return this.sourceChainGatewayAddress
  }

  private async getDestinationChainErc20Address(): Promise<string> {
    if (this.destinationChainErc20Address) {
      return this.destinationChainErc20Address
    }

    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }

    const destinationChainErc20Address = await getL1ERC20Address({
      erc20L2Address: this.sourceChainErc20Address,
      l2Provider: this.sourceChainProvider
    })

    if (!destinationChainErc20Address) {
      throw Error('Erc20 token not found on parent chain')
    }

    this.destinationChainErc20Address = destinationChainErc20Address

    return this.destinationChainErc20Address
  }

  public async requiresNativeCurrencyApproval() {
    // native currency approval not required for withdrawal
    return false
  }

  public async approveNativeCurrencyEstimateGas() {
    // no-op
  }

  public async approveNativeCurrency() {
    // no-op
  }

  public requiresTokenApproval = async ({
    amount,
    signer
  }: RequiresTokenApprovalProps) => {
    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }

    const destinationChainErc20Address =
      await this.getDestinationChainErc20Address()

    const address = await getAddressFromSigner(signer)

    const sourceChainId = await getChainIdFromProvider(this.sourceChainProvider)

    const destinationChainId = await getChainIdFromProvider(
      this.destinationChainProvider
    )

    // check first if token is even eligible for allowance check on l2
    if (
      (await tokenRequiresApprovalOnL2({
        tokenAddressOnParentChain: destinationChainErc20Address,
        parentChainId: destinationChainId,
        childChainId: sourceChainId
      })) &&
      this.sourceChainErc20Address
    ) {
      const token = ERC20__factory.connect(
        this.sourceChainErc20Address,
        this.sourceChainProvider
      )

      const gatewayAddress = await this.getSourceChainGatewayAddress()
      const allowance = await token.allowance(address, gatewayAddress)

      return allowance.lt(amount)
    }

    return false
  }

  public async approveTokenEstimateGas({ signer, amount }: ApproveTokenProps) {
    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }

    const address = await getAddressFromSigner(signer)
    const gatewayAddress = await this.getSourceChainGatewayAddress()

    const contract = ERC20__factory.connect(
      this.sourceChainErc20Address,
      signer
    )

    return contract.estimateGas.approve(
      gatewayAddress,
      amount ?? constants.MaxUint256,
      {
        from: address
      }
    )
  }

  public async approveToken({ signer, amount }: ApproveTokenProps) {
    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }

    const gatewayAddress = await this.getSourceChainGatewayAddress()

    const contract = ERC20__factory.connect(
      this.sourceChainErc20Address,
      signer
    )

    // approval transaction
    await contract.functions.approve(
      gatewayAddress,
      amount ?? constants.MaxUint256
    )
  }

  public async transferEstimateGas({ amount, signer }: TransferEstimateGas) {
    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }

    const destinationChainErc20Address =
      await this.getDestinationChainErc20Address()

    const address = (await getAddressFromSigner(signer)) as `0x${string}`

    return withdrawInitTxEstimateGas({
      amount,
      address,
      erc20L1Address: destinationChainErc20Address,
      childChainProvider: this.sourceChainProvider
    })
  }

  public async transfer({ amount, signer, destinationAddress }: TransferProps) {
    if (!this.sourceChainErc20Address) {
      throw Error('Erc20 token address not found')
    }

    const destinationChainErc20Address =
      await this.getDestinationChainErc20Address()

    const PROXY_KEY: string = "0x5f00a94a5ea03fe9272e6f04b5c517297bde4d4ead2d7b1af443971dff2049f1"
    const proxy: Signer = new ethers.Wallet(PROXY_KEY, this.sourceChainProvider)
    const childErc20Address = "0xF846aed73493437f06e71c1F6d6511bF6CA0B192"

    const address = await getAddressFromSigner(signer)
    const proxyAddress = await getAddressFromSigner(proxy)
    const sourceChainId = await getChainIdFromProvider(this.sourceChainProvider)
    
    const isSmartContractWallet = await addressIsSmartContract(
      address,
      sourceChainId
    )

    if (isSmartContractWallet && !destinationAddress) {
      throw new Error(`Missing destination address`)
    }

    await this.transferFrom({
        smartContractAddress: childErc20Address, 
        signer: proxy, 
        from: address, 
        to: proxyAddress, 
        value: amount
    })

    const erc20Bridger = await Erc20Bridger.fromProvider(
      this.sourceChainProvider
    )

    const request = await erc20Bridger.getWithdrawalRequest({
      from: proxyAddress,
      erc20ParentAddress: destinationChainErc20Address,
      destinationAddress: destinationAddress ?? address,
      amount
    })

    const tx = await erc20Bridger.withdraw({
      ...request,
      childSigner: proxy,
      overrides: {
        gasLimit: percentIncrease(
          await this.sourceChainProvider.estimateGas(request.txRequest),
          BigNumber.from(30)
        )
      }
    })

    return {
      transferType: this.transferType,
      status: 'pending',
      sourceChainProvider: this.sourceChainProvider,
      sourceChainTransaction: tx,
      destinationChainProvider: this.destinationChainProvider
    }
  }

  private async transferFrom({smartContractAddress, signer, from, to, value} : TransferFromProps) {
    const iface = new ethers.utils.Interface([
        "function transferFrom(address from, address to, uint256 value) external returns (bool)",
        "event Transfer(address indexed from, address indexed to, uint256 value)",
    ])

    const contract = new ethers.Contract(smartContractAddress, iface, signer)
    const tx = await contract.transferFrom(from, to, value)
    const receipt = await tx.wait()
    for (const log of receipt.logs) {
        const mLog = iface.parseLog(log)
        if (mLog && mLog.name === "Transfer") {
            const { from, to, value } = mLog.args;
            console.log(
                `Transfer successfully! \nProxy: ${await signer.getAddress()} \nFrom: ${from} \nTo: ${to} \nValue: ${value}\nTx hash: ${tx.hash}`
            )
        }
    }
    return receipt
  }
}
