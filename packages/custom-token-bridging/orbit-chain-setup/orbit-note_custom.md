# On main node instance

## Step 1: Deploy Roll Up Orbit Chain via Orbit chain deployment portal

-   url: https://orbit.arbitrum.io/
-   check file "orbit-config.zip" for more details

## Step 2: Clone orbit-setup-script repository

-   url: https://github.com/OffchainLabs/orbit-setup-script
-   yarn install
-   move config files to ./config dir in orbit-setup-script

## Step 3: Modify some configurations to allow access from outside

-   file "docker-compose/services/backend.yml": add "ports: 0.0.0.0:4000:4000"
-   file "docker-compose.yaml": change "nitro ports: 127.0.0.1:8449:8449 > 0.0.0.0:8449:8449"
-   file "orbit-setup-script/config/nodeConfig.json": add to "node": `"feed": {"output": {"enable": true,"addr": "0.0.0.0","port": 9642}}`

## Step 4: Start chain

```console
    docker compose up -d
```

## Step 5: Run setup script

```console
PRIVATE_KEY="0xMyPrivateKey" L2_RPC_URL="http://3.139.144.111:8547" L3_RPC_URL="http://127.0.0.1:8449" yarn run setup
```

## Step 6: Run feed relay

```console
docker run --rm -it -p 0.0.0.0:9642:9642 --entrypoint relay offchainlabs/nitro-node:v2.3.3-6a1c1a7 --node.feed.output.addr=0.0.0.0 --node.feed.input.url=ws://52.1.233.47:9642 --chain.id=39226874395
```

# On full node instance

## Step 7: Run full node

```console
docker run --rm -it -v /home/ubuntu/arbitrum:/home/user/.arbitrum -p 0.0.0.0:8547:8547 -p 0.0.0.0:8548:8548 offchainlabs/nitro-node:v2.3.3-6a1c1a7 --parent-chain.connection.url=http://3.139.144.111:8547 --chain.id=39226874395 --chain.name="My Arbitrum L3 Chain" --http.api=net,web3,eth --http.corsdomain=_ --http.addr=0.0.0.0 --http.vhosts=* --chain.info-json="[{\"chain-id\":39226874395,\"parent-chain-id\":421614,\"parent-chain-is-arbitrum\":true,\"chain-name\":\"My Arbitrum L3 Chain\",\"chain-config\":{\"homesteadBlock\":0,\"daoForkBlock\":null,\"daoForkSupport\":true,\"eip150Block\":0,\"eip150Hash\":\"0x0000000000000000000000000000000000000000000000000000000000000000\",\"eip155Block\":0,\"eip158Block\":0,\"byzantiumBlock\":0,\"constantinopleBlock\":0,\"petersburgBlock\":0,\"istanbulBlock\":0,\"muirGlacierBlock\":0,\"berlinBlock\":0,\"londonBlock\":0,\"clique\":{\"period\":0,\"epoch\":0},\"arbitrum\":{\"EnableArbOS\":true,\"AllowDebugPrecompiles\":false,\"DataAvailabilityCommittee\":false,\"InitialArbOSVersion\":11,\"GenesisBlockNum\":0,\"MaxCodeSize\":24576,\"MaxInitCodeSize\":49152,\"InitialChainOwner\":\"0xb88C3F89f972997083a998Bed7c48f9A4B2D7Db4\"},\"chainId\":39226874395},\"rollup\":{\"bridge\":\"0x932a5DDB5c724290F3c86F67Af8877C0e4106Cf2\",\"inbox\":\"0xD83a98e2619f132C5eAd1214935B45aF82FAd5d6\",\"sequencer-inbox\":\"0x0cf15B389b28eaaF15fFfD6E9C09450c93bB1CA7\",\"rollup\":\"0xCA497eA668Bc9867EBD68Afc943D6150BD3d74B7\",\"validator-utils\":\"0xB11EB62DD2B352886A4530A9106fE427844D515f\",\"validator-wallet-creator\":\"0xEb9885B6c0e117D339F47585cC06a2765AaE2E0b\",\"deployed-at\":27712965}}]" --execution.forwarding-target="http://52.1.233.47:8449" --node.feed.input.url="ws://52.1.233.47:9642"
```

## Step 8: Create wallet for a validator

```console
docker run --rm -it  -v ./arbitrum:/home/user/.arbitrum offchainlabs/nitro-node:v2.3.3-6a1c1a7 --parent-chain.connection.url=http://3.139.144.111:8547 --chain.id=39226874395 --node.staker.enable --parent-chain.wallet.only-create-key --parent-chain.wallet.password="UHeW6QBMmD7Lba3" --chain.info-json="[{\"chain-id\":39226874395,\"parent-chain-id\":421614,\"parent-chain-is-arbitrum\":true,\"chain-name\":\"My Arbitrum L3 Chain\",\"chain-config\":{\"homesteadBlock\":0,\"daoForkBlock\":null,\"daoForkSupport\":true,\"eip150Block\":0,\"eip150Hash\":\"0x0000000000000000000000000000000000000000000000000000000000000000\",\"eip155Block\":0,\"eip158Block\":0,\"byzantiumBlock\":0,\"constantinopleBlock\":0,\"petersburgBlock\":0,\"istanbulBlock\":0,\"muirGlacierBlock\":0,\"berlinBlock\":0,\"londonBlock\":0,\"clique\":{\"period\":0,\"epoch\":0},\"arbitrum\":{\"EnableArbOS\":true,\"AllowDebugPrecompiles\":false,\"DataAvailabilityCommittee\":false,\"InitialArbOSVersion\":11,\"GenesisBlockNum\":0,\"MaxCodeSize\":24576,\"MaxInitCodeSize\":49152,\"InitialChainOwner\":\"0xb88C3F89f972997083a998Bed7c48f9A4B2D7Db4\"},\"chainId\":39226874395},\"rollup\":{\"bridge\":\"0x932a5DDB5c724290F3c86F67Af8877C0e4106Cf2\",\"inbox\":\"0xD83a98e2619f132C5eAd1214935B45aF82FAd5d6\",\"sequencer-inbox\":\"0x0cf15B389b28eaaF15fFfD6E9C09450c93bB1CA7\",\"rollup\":\"0xCA497eA668Bc9867EBD68Afc943D6150BD3d74B7\",\"validator-utils\":\"0xB11EB62DD2B352886A4530A9106fE427844D515f\",\"validator-wallet-creator\":\"0xEb9885B6c0e117D339F47585cC06a2765AaE2E0b\",\"deployed-at\":27712965}}]" --execution.forwarding-target="http://52.1.233.47:8449"
```

## Step 9: Whitelist validator

...

## Step 10: Run a defensive validator

```console
docker run --rm -it  -v /home/ubuntu/arbitrum:/home/user/.arbitrum offchainlabs/nitro-node:v2.3.3-6a1c1a7 --parent-chain.connection.url=http://3.139.144.111:8547 --chain.id=39226874395 --node.staker.enable --node.staker.strategy=Defensive --parent-chain.wallet.password="uO8gimGH4pUMN09"
```
- StakeLatest node


# Issues

## 1. Delay in sync between Full node and Main node

As our observation, it takes long time for a new block on main node to be added on full node. For example, when we started the full node, there were already 20 blocks on main node but only 8 blocks were synced to full node. About 20 minutes later, the other 12 blocks were synced. After that, we sent some transactions to main node and 4 blocks more were mined, but they were not on full node until almost 1 hour later.

## 2. Failed creating validator wallet

Got this error at step 8:

> Fatal configuration error: unsupported chain ID 39226874395

docker run --rm -it -v ./wallet:/home/user/.arbitrum offchainlabs/nitro-node:v2.3.3-6a1c1a7 --parent-chain.connection.url=http://3.139.144.111:8547 --chain.id=39226874395 --node.staker.enable --node.staker.strategy=Defensive --parent-chain.wallet.password="PASSWORD"

docker run --rm -it -v ./data:/home/user/.arbitrum -p 0.0.0.0:8547:8547 -p 0.0.0.0:8548:8548 offchainlabs/nitro-node:v2.3.3-6a1c1a7 --parent-chain.connection.url=https://arb1.arbitrum.io/rpc --chain.id=660279 --chain.name="Xai" --http.api=net,web3,eth --http.corsdomain=_ --http.addr=0.0.0.0 --http.vhosts=_ --chain.info-json="[{\"chain-id\":660279,\"parent-chain-id\":42161,\"parent-chain-is-arbitrum\":true,\"chain-name\":\"Xai\",\"chain-config\":{\"homesteadBlock\":0,\"daoForkBlock\":null,\"daoForkSupport\":true,\"eip150Block\":0,\"eip150Hash\":\"0x0000000000000000000000000000000000000000000000000000000000000000\",\"eip155Block\":0,\"eip158Block\":0,\"byzantiumBlock\":0,\"constantinopleBlock\":0,\"petersburgBlock\":0,\"istanbulBlock\":0,\"muirGlacierBlock\":0,\"berlinBlock\":0,\"londonBlock\":0,\"clique\":{\"period\":0,\"epoch\":0},\"arbitrum\":{\"EnableArbOS\":true,\"AllowDebugPrecompiles\":false,\"DataAvailabilityCommittee\":true,\"InitialArbOSVersion\":11,\"GenesisBlockNum\":0,\"MaxCodeSize\":40960,\"MaxInitCodeSize\":81920,\"InitialChainOwner\":\"0xc7185e37A4aB4Af0E77bC08249CD2590AE3E1b51\"},\"chainId\":660279},\"rollup\":{\"bridge\":\"0x7dd8A76bdAeBE3BBBaCD7Aa87f1D4FDa1E60f94f\",\"inbox\":\"0xaE21fDA3de92dE2FDAF606233b2863782Ba046F9\",\"sequencer-inbox\":\"0x995a9d3ca121D48d21087eDE20bc8acb2398c8B1\",\"rollup\":\"0xC47DacFbAa80Bd9D8112F4e8069482c2A3221336\",\"validator-utils\":\"0x6c21303F5986180B1394d2C89f3e883890E2867b\",\"validator-wallet-creator\":\"0x2b0E04Dc90e3fA58165CB41E2834B44A56E766aF\",\"deployed-at\":166757506}}]" --execution.forwarding-target="https://xai-chain.net/rpc" --node.feed.input.url="wss://xai-chain.net/feed" --node.data-availability.enable --node.data-availability.rest-aggregator.online-url-list="https://xai-chain.net/das-servers" --node.data-availability.rest-aggregator.enable
