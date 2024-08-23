### Cấu hình chain:
- Main node: Tinhnt_stardust_api (Ohio)
- Fullnode: Tinhnt_edge_node3 (Ohio)
- Validator node:
	- Defensive node: Tinhnt_aval_node4 (Oregon)
	- StakeLatest: Tinhnt_aval_node1 (Virginia)
	- ResolveNode: Tinhnt_aval_node5 (Ohio)
- Explorer:
- DAS server test: Tinhnt_aval_node2 (Virginia)

# On main node instance

## Step 1: Deploy Roll Up Orbit Chain via Orbit chain deployment portal

-   url: https://orbit.arbitrum.io/
-   check file "orbit-config.zip" for more details

## Step 2: Clone orbit-setup-script repository

-   url: https://github.com/OffchainLabs/orbit-setup-script
-   yarn install
-   move config files to ./config dir in orbit-setup-script

## Step 3: Modify some configurations to allow access from outside

-   file "docker-compose/services/backend.yml": add "ports: - 0.0.0.0:4000:4000"
-   file "docker-compose.yaml": change "nitro ports: 127.0.0.1:8449:8449 > 0.0.0.0:8449:8449"
-   file "orbit-setup-script/config/nodeConfig.json":
      - add to "node": `"feed": {"output": {"enable": true,"addr": "0.0.0.0","port": 9642}}`
      - change parent-chain-url: "http://3.139.144.111:8547" - Full-node L2 chain

## Step 4: Start chain

```console
docker compose up -d
```

## Step 5: Run setup script

```console
PRIVATE_KEY="0xf70920bc474b73aa90bff0d7ac295cd840b72375aeea12b20ff88460dac80f53" L2_RPC_URL="http://3.139.144.111:8547" L3_RPC_URL="http://127.0.0.1:8449" yarn run setup
```

## Step 6: Run feed relay

```console
docker run --rm -it -p 0.0.0.0:9642:9642 --entrypoint relay offchainlabs/nitro-node:v2.3.3-6a1c1a7 --node.feed.output.addr=0.0.0.0 --node.feed.input.url=ws://18.119.5.142:9642 --chain.id=59855867290
```

# On full node instance

## Step 7: Run full node

```console
docker run --rm -it -v /home/ubuntu/arbitrum:/home/user/.arbitrum -p 0.0.0.0:8547:8547 -p 0.0.0.0:8548:8548 offchainlabs/nitro-node:v2.3.3-6a1c1a7 --parent-chain.connection.url=http://3.139.144.111:8547 --chain.id=59855867290 --chain.name="My Arbitrum L3 Chain 2" --http.api=net,web3,eth,debug --http.corsdomain=_ --http.addr=0.0.0.0 --http.vhosts=* --chain.info-json="[{\"chain-id\":59855867290,\"parent-chain-id\":421614,\"parent-chain-is-arbitrum\":true,\"chain-name\":\"My Arbitrum L3 Chain 2\",\"chain-config\":{\"homesteadBlock\":0,\"daoForkBlock\":null,\"daoForkSupport\":true,\"eip150Block\":0,\"eip150Hash\":\"0x0000000000000000000000000000000000000000000000000000000000000000\",\"eip155Block\":0,\"eip158Block\":0,\"byzantiumBlock\":0,\"constantinopleBlock\":0,\"petersburgBlock\":0,\"istanbulBlock\":0,\"muirGlacierBlock\":0,\"berlinBlock\":0,\"londonBlock\":0,\"clique\":{\"period\":0,\"epoch\":0},\"arbitrum\":{\"EnableArbOS\":true,\"AllowDebugPrecompiles\":false,\"DataAvailabilityCommittee\":true,\"InitialArbOSVersion\":11,\"GenesisBlockNum\":0,\"MaxCodeSize\":24576,\"MaxInitCodeSize\":49152,\"InitialChainOwner\":\"0xc2CCcfd3215A44104D74c5188217574c92d9d745\"},\"chainId\":59855867290},\"rollup\":{\"bridge\":\"0x5941ECe7E243bD26E29452f2b89Fe835532B279c\",\"inbox\":\"0x3b85d9EA73C29f8Ff53C5d7EBdA467256BBb1682\",\"sequencer-inbox\":\"0x3DDeF1a86658be9ed5cB82c51d1f2b9E181fdB34\",\"rollup\":\"0x073DA03089E5AdA9B3654499080bA45fEB58a89c\",\"validator-utils\":\"0xB11EB62DD2B352886A4530A9106fE427844D515f\",\"validator-wallet-creator\":\"0xEb9885B6c0e117D339F47585cC06a2765AaE2E0b\",\"deployed-at\":36650669}}]" --execution.forwarding-target="http://18.119.5.142:8449" --node.feed.input.url="ws://18.119.5.142:9642"  --node.data-availability.enable --node.data-availability.rest-aggregator.enable --node.data-availability.rest-aggregator.urls="http://18.119.5.142:9876" & disown
```

## Step 8: Create wallet for a validator

```console
docker run --rm -it  -v /home/ubuntu/arbitrum:/home/user/.arbitrum offchainlabs/nitro-node:v2.3.3-6a1c1a7 --parent-chain.connection.url=http://3.139.144.111:8547 --chain.id=59855867290 --node.staker.enable --parent-chain.wallet.only-create-key --parent-chain.wallet.password="UHeW6QBMmD7Lba3" --chain.info-json="[{\"chain-id\":59855867290,\"parent-chain-id\":421614,\"parent-chain-is-arbitrum\":true,\"chain-name\":\"My Arbitrum L3 Chain 2\",\"chain-config\":{\"homesteadBlock\":0,\"daoForkBlock\":null,\"daoForkSupport\":true,\"eip150Block\":0,\"eip150Hash\":\"0x0000000000000000000000000000000000000000000000000000000000000000\",\"eip155Block\":0,\"eip158Block\":0,\"byzantiumBlock\":0,\"constantinopleBlock\":0,\"petersburgBlock\":0,\"istanbulBlock\":0,\"muirGlacierBlock\":0,\"berlinBlock\":0,\"londonBlock\":0,\"clique\":{\"period\":0,\"epoch\":0},\"arbitrum\":{\"EnableArbOS\":true,\"AllowDebugPrecompiles\":false,\"DataAvailabilityCommittee\":true,\"InitialArbOSVersion\":11,\"GenesisBlockNum\":0,\"MaxCodeSize\":24576,\"MaxInitCodeSize\":49152,\"InitialChainOwner\":\"0xc2CCcfd3215A44104D74c5188217574c92d9d745\"},\"chainId\":59855867290},\"rollup\":{\"bridge\":\"0x5941ECe7E243bD26E29452f2b89Fe835532B279c\",\"inbox\":\"0x3b85d9EA73C29f8Ff53C5d7EBdA467256BBb1682\",\"sequencer-inbox\":\"0x3DDeF1a86658be9ed5cB82c51d1f2b9E181fdB34\",\"rollup\":\"0x073DA03089E5AdA9B3654499080bA45fEB58a89c\",\"validator-utils\":\"0xB11EB62DD2B352886A4530A9106fE427844D515f\",\"validator-wallet-creator\":\"0xEb9885B6c0e117D339F47585cC06a2765AaE2E0b\",\"deployed-at\":36650669}}]" --execution.forwarding-target="http://18.119.5.142:8449"
```

## Step 9: Whitelist validator

...

#### Defensive node (54.185.59.7 - Tinhnt_aval_node4 - Oregon)

docker run --rm -it  -v /home/ubuntu/arbitrum:/home/user/.arbitrum -p 0.0.0.0:8547:8547 -p 0.0.0.0:8548:8548  offchainlabs/nitro-node:v2.3.3-6a1c1a7 --parent-chain.connection.url=http://3.139.144.111:8547 --chain.id=59855867290 --node.staker.enable --node.staker.strategy=Defensive --parent-chain.wallet.password="uO8gimGH4pUMN09" --chain.info-json="[{\"chain-id\":59855867290,\"parent-chain-id\":421614,\"parent-chain-is-arbitrum\":true,\"chain-name\":\"My Arbitrum L3 Chain 2\",\"chain-config\":{\"homesteadBlock\":0,\"daoForkBlock\":null,\"daoForkSupport\":true,\"eip150Block\":0,\"eip150Hash\":\"0x0000000000000000000000000000000000000000000000000000000000000000\",\"eip155Block\":0,\"eip158Block\":0,\"byzantiumBlock\":0,\"constantinopleBlock\":0,\"petersburgBlock\":0,\"istanbulBlock\":0,\"muirGlacierBlock\":0,\"berlinBlock\":0,\"londonBlock\":0,\"clique\":{\"period\":0,\"epoch\":0},\"arbitrum\":{\"EnableArbOS\":true,\"AllowDebugPrecompiles\":false,\"DataAvailabilityCommittee\":true,\"InitialArbOSVersion\":11,\"GenesisBlockNum\":0,\"MaxCodeSize\":24576,\"MaxInitCodeSize\":49152,\"InitialChainOwner\":\"0xc2CCcfd3215A44104D74c5188217574c92d9d745\"},\"chainId\":59855867290},\"rollup\":{\"bridge\":\"0x5941ECe7E243bD26E29452f2b89Fe835532B279c\",\"inbox\":\"0x3b85d9EA73C29f8Ff53C5d7EBdA467256BBb1682\",\"sequencer-inbox\":\"0x3DDeF1a86658be9ed5cB82c51d1f2b9E181fdB34\",\"rollup\":\"0x073DA03089E5AdA9B3654499080bA45fEB58a89c\",\"validator-utils\":\"0xB11EB62DD2B352886A4530A9106fE427844D515f\",\"validator-wallet-creator\":\"0xEb9885B6c0e117D339F47585cC06a2765AaE2E0b\",\"deployed-at\":36650669}}]" --http.api=net,web3,eth --http.corsdomain= --http.addr=0.0.0.0 --http.vhosts=* --node.feed.input.url="ws://18.119.5.142:9642" --node.data-availability.enable --node.data-availability.rest-aggregator.enable --node.data-availability.rest-aggregator.urls="http://18.119.5.142:9876" --execution.forwarding-target="http://18.119.5.142:8449" & disown


####  CMD start StakeLatest node (Tinhnt_aval_node1 - 100.25.95.185 - Virginia)

docker run --rm -it  -v /home/ubuntu/arbitrum:/home/user/.arbitrum -p 0.0.0.0:8547:8547 -p 0.0.0.0:8548:8548  offchainlabs/nitro-node:v2.3.3-6a1c1a7 --parent-chain.connection.url=http://3.139.144.111:8547 --chain.id=59855867290 --node.staker.enable --node.staker.strategy=StakeLatest --parent-chain.wallet.password="UHeW6QBMmD7Lba3" --chain.info-json="[{\"chain-id\":59855867290,\"parent-chain-id\":421614,\"parent-chain-is-arbitrum\":true,\"chain-name\":\"My Arbitrum L3 Chain 2\",\"chain-config\":{\"homesteadBlock\":0,\"daoForkBlock\":null,\"daoForkSupport\":true,\"eip150Block\":0,\"eip150Hash\":\"0x0000000000000000000000000000000000000000000000000000000000000000\",\"eip155Block\":0,\"eip158Block\":0,\"byzantiumBlock\":0,\"constantinopleBlock\":0,\"petersburgBlock\":0,\"istanbulBlock\":0,\"muirGlacierBlock\":0,\"berlinBlock\":0,\"londonBlock\":0,\"clique\":{\"period\":0,\"epoch\":0},\"arbitrum\":{\"EnableArbOS\":true,\"AllowDebugPrecompiles\":false,\"DataAvailabilityCommittee\":true,\"InitialArbOSVersion\":11,\"GenesisBlockNum\":0,\"MaxCodeSize\":24576,\"MaxInitCodeSize\":49152,\"InitialChainOwner\":\"0xc2CCcfd3215A44104D74c5188217574c92d9d745\"},\"chainId\":59855867290},\"rollup\":{\"bridge\":\"0x5941ECe7E243bD26E29452f2b89Fe835532B279c\",\"inbox\":\"0x3b85d9EA73C29f8Ff53C5d7EBdA467256BBb1682\",\"sequencer-inbox\":\"0x3DDeF1a86658be9ed5cB82c51d1f2b9E181fdB34\",\"rollup\":\"0x073DA03089E5AdA9B3654499080bA45fEB58a89c\",\"validator-utils\":\"0xB11EB62DD2B352886A4530A9106fE427844D515f\",\"validator-wallet-creator\":\"0xEb9885B6c0e117D339F47585cC06a2765AaE2E0b\",\"deployed-at\":36650669}}]" --http.api=net,web3,eth --http.corsdomain= --http.addr=0.0.0.0 --http.vhosts=* --node.feed.input.url="ws://18.119.5.142:9642" --node.data-availability.enable --node.data-availability.rest-aggregator.enable --node.data-availability.rest-aggregator.urls="http://18.119.5.142:9876" --execution.forwarding-target="http://18.119.5.142:8449" & disown


#### Run DAS server
### Create dac_mirror and set permission
mkdir /home/ubuntu/dac_mirror
sudo chmod -fR 777 /home/ubuntu/dac_mirror

mkdir /home/ubuntu/dac_mirror/keys
sudo chmod -fR 777 /home/ubuntu/dac_mirror/keys

###Cmd  Gen BLS keys
docker run -v /home/ubuntu/dac_mirror/keys:/data/keys --entrypoint datool \
offchainlabs/nitro-node:v2.3.3-6a1c1a7 keygen --dir /data/keys

### Cmd Gen ECDSA key pairs
docker run --rm -it -v /home/ubuntu/dac_mirror/ecdsa:/home/user/data --entrypoint datool offchainlabs/nitro-node:v2.3.3-6a1c1a7 keygen --dir /home/user/data/keys --ecdsa


### Start DAS server command:
docker run --rm -it  -p 0.0.0.0:9876:9876 -p 0.0.0.0:9877:9877 -v /home/ubuntu/dac_mirror/:/home/user/data/ --entrypoint daserver offchainlabs/nitro-node:v2.3.3-6a1c1a7 \
    --data-availability.parent-chain-node-url "http://3.139.144.111:8547"	\
    --data-availability.sequencer-inbox-address "0x3DDeF1a86658be9ed5cB82c51d1f2b9E181fdB34"	\
    --data-availability.key.key-dir /home/user/data/keys/bls_keys	\
    --enable-rpc	\
    --rpc-addr '0.0.0.0'	\
    --log-level 3	\
    --enable-rest	\
    --rest-addr '0.0.0.0'	\
    --data-availability.local-cache.enable	\
    --data-availability.rest-aggregator.enable	\
    --data-availability.local-db-storage.enable	\
    --data-availability.local-db-storage.data-dir /home/user/data/badgerdb	\
    --data-availability.local-db-storage.discard-after-timeout=false	\
    --data-availability.s3-storage.discard-after-timeout=false	\
    --data-availability.rest-aggregator.urls "http://18.119.5.142:9876" 	\
    --data-availability.rest-aggregator.sync-to-storage.check-already-exists \
    --data-availability.extra-signature-checking-public-key /home/user/data/keys/ecdsa/ecdsa.pub

### Command check DAS server health
curl -X POST \
     -H 'Content-Type: application/json' \
     -d '{"jsonrpc":"2.0","id":0,"method":"das_healthCheck","params":[]}' \
     "http://18.119.5.142:9876"

### Get keyset from BLS key
1. Make file datest-keyset.conf
Add this object to file

{
    "keyset": {
      "assumed-honest": 1,
      "backends": "[{\"url\":\"http://example\",\"pubkey\":\"<BLS_key_string>\",\"signermask\":1}]"
    }
}

### Cmd get keyset
datool dumpkeyset --conf.file data/datest-keyset.conf


scp -i key-ssh/boom_deepfake.pem ubuntu@18.119.5.142:~/dat/orbit-setup-script/network.json .

scp -i ~/work_dir/key-ssh/boom_deepfake.pem nodeConfig.json ubuntu@18.119.5.142:~/dat/orbit-config/orbit-setup-script/config/
scp -i ~/work_dir/key-ssh/boom_deepfake.pem orbitSetupScriptConfig.json ubuntu@18.119.5.142:~/dat/orbit-config/orbit-setup-script/config/