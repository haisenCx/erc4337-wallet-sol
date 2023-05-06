# AA Wallet Solidity

## Setup 

### Install

```shell
npm install
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
2. Deploy AA Wallet
   ```shell
   npm run deploy-aawallet-mumbai
   ```
3. Verify on blockchain
   ```shell
   # modify params according to 1&2 result
   npm run verify-mumbai
   ```

## Contract Address

### Mumbai Test Network

1. ERC4337
   - EntryPoint: [0x9441180e0C561c252b3bF7c2048864b7F0A662A6](https://mumbai.polygonscan.com/address/0x9441180e0C561c252b3bF7c2048864b7F0A662A6)
   - SimpleAccountFactory: [0xD640F8f864a212CfDd8FE8B9Fdfb69d24f09b65e](https://mumbai.polygonscan.com/address/0xD640F8f864a212CfDd8FE8B9Fdfb69d24f09b65e)
   - Myron's SimpleAccount: [0x884fBD8043BedC0c700577cbB7632D09dB8E35Fd](https://mumbai.polygonscan.com/address/0x884fBD8043BedC0c700577cbB7632D09dB8E35Fd)
   - TokenPaymaster: [0xa4baa71e173Ef63250fB1D9a1FE1467f722B19C7](https://mumbai.polygonscan.com/address/0xa4baa71e173Ef63250fB1D9a1FE1467f722B19C7)
2. AA Wallet
   - UserInfo: [0x29178664bd167967a901b508f953AA38cf33248B](https://mumbai.polygonscan.com/address/0x29178664bd167967a901b508f953AA38cf33248B)

## ERC4337

![erc4337.png](image/erc4337.png)


## Doc
1. eip4337: https://eips.ethereum.org/EIPS/eip-4337
2. eip4337 vitalik blog：https://medium.com/infinitism/erc-4337-account-abstraction-without-ethereum-protocol-changes
   -d75c9d94dc4a
3. AA code source: https://github.com/eth-infinitism/account-abstraction
4. AA blog by alchemy: https://www.alchemy.com/blog/account-abstraction
5. Multisign: https://github.com/safe-global/safe-contracts(https://github.com/OpenZeppelin/gnosis-multisig)
6. mumbai chainLink：https://faucets.chain.link/mumbai
7. mumbai faucet: https://faucet.polygon.technology/
