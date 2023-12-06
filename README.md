# AA Wallet Solidity

## Dependence

- Node: v16.x+

## Setup 

### Install

```shell
# commom package
npm install
```

### Set env

1. Copy config
    ```shell
    cp .env.example .env
    ```
2. modify environment variables
    ```
    SCAN_API_KEY=ABC123ABC123ABC123ABC123ABC123ABC1
    # your ethereum address private key
    PRIVATE_KEY=0xabc123abc123abc123abc123abc123abc123abc123abc123abc123abc123abc1
    ```
   
## Test

1. Test entrypoint
    ```shell
    npm run entry-test
    ```
2. Test sign
    ```shell
    npm run sign-test
    ```
3. Test event-hash
    ```shell
    npm run event-hash
    ```


## Deploy

### Polgon Network

1. Deploy ERC4337 component
   ```shell
   npm run deploy-erc4337-polygon
   ```

### Mumbai Test Network

1. Deploy ERC4337 component
   ```shell
   npm run deploy-erc4337-mumbai
   ```

## Contract Address

[Contract Address](https://z4kqs8pky3.feishu.cn/docx/JSgtdpFffoTlKcxldTzcFjNSnOc)

## ERC4337

![erc4337.png](image/erc4337.png)


## Document

1. EIP4337: https://eips.ethereum.org/EIPS/eip-4337
2. EIP4337 vitalik blog：https://medium.com/infinitism/erc-4337-account-abstraction-without-ethereum-protocol-changes-d75c9d94dc4a
3. AA code source: https://github.com/eth-infinitism/account-abstraction
4. AA blog by Alchemy: https://www.alchemy.com/blog/account-abstraction
5. Multi sign: https://github.com/safe-global/safe-contracts(https://github.com/OpenZeppelin/gnosis-multisig)
6. Mumbai chainLink：https://faucets.chain.link/mumbai
7. Mumbai faucet: https://faucet.polygon.technology
