# AA Wallet Solidity

## Dependence

- Node: v16.x+

## Setup 

### Install

```shell
# commom package
npm install

# install uniswap package
npm install --save-dev @uniswap/v3-core@1.0.2-solc-0.8-simulate
npm install --save-dev git+https://github.com/Uniswap/v3-periphery.git#0.8
```


### Set env

1. Copy config
    ```shell
    cp .env.example .env
    ```
2. modify environment variables
    ```
    ETHERSCAN_API_KEY=ABC123ABC123ABC123ABC123ABC123ABC1
    # your ethereum address private key
    PRIVATE_KEY=0xabc123abc123abc123abc123abc123abc123abc123abc123abc123abc123abc1
    ```
   
## Test



## Deploy

### Mumbai Test Network

1. Deploy ERC4337 component
   ```shell
   npm run deploy-erc4337-mumbai
   ```
2. Deploy auto trading
   ```shell
   npm run deploy-aawallet-mumbai
   ```

## Contract Address

[Contract Address](./DeployedContract.md)

## ERC4337

![erc4337.png](image/erc4337.png)


## Doc
1. EIP4337: https://eips.ethereum.org/EIPS/eip-4337
2. EIP4337 vitalik blog：https://medium.com/infinitism/erc-4337-account-abstraction-without-ethereum-protocol-changes-d75c9d94dc4a
3. AA code source: https://github.com/eth-infinitism/account-abstraction
4. AA blog by Alchemy: https://www.alchemy.com/blog/account-abstraction
5. Multi sign: https://github.com/safe-global/safe-contracts(https://github.com/OpenZeppelin/gnosis-multisig)
6. Mumbai chainLink：https://faucets.chain.link/mumbai
7. Mumbai faucet: https://faucet.polygon.technology
