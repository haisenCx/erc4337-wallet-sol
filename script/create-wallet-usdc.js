const { ethers } = require("hardhat");
const utils = require("./utils");

async function main() {
  
    let config = utils.getConfig();

    let [addr, ...addrs] = await ethers.getSigners();
    console.log("address: " + addr.address);

    const salt = 0;

    const smarterAccountV1FactoryF = await ethers.getContractFactory("SmarterAccountV1Factory");
    const smarterAccountV1FactoryContract = await smarterAccountV1FactoryF.attach(config.contractAddress.smarterV1Factory);

    const smarterAccountAddress = smarterAccountV1FactoryContract.getAddress(addr.address, salt);

    const smarterAccountV1Factory = await ethers.getContractFactory("SmarterAccountV1");
    const smarterAccountV1 = await smarterAccountV1Factory.attach(smarterAccountAddress);

    const senderAddress = await smarterAccountV1.address;
    console.log("Sender Address: %s", senderAddress);

    const gasPrice = await hre.ethers.provider.getGasPrice();

    const nonce = "0";

    console.log(JSON.stringify(await utils.sendTxCreateWallet(
        {
            // signer by private key in .nev file
            signer: addr,
        },
        {
            // contract wallet address
            senderAddress: senderAddress,
            // contract wallet nonce
            nonce: nonce,
            // tx gasfee config
            gasfee: {
                // The token address of the paymaster
                tokenPayMasterAddress: config.contractAddress.usdcPaymaster,
                // The token address from which the gasfee is paid
                payGasfeeTokenAddress: config.contractAddress.usdc,
                // gas price
                gasPrice: gasPrice,
                // gaslimit
                gasLimit: config.txConfig.gasLimit,
            },
            // entrypoint contract info
            entrypoint: {
                // entrypoint contract address
                address: config.contractAddress.entryPoint,
            },
        },
        {
            // create wallet factory address
            accountFactoryAddress: config.contractAddress.smarterV1Factory,
            // create wallet salt
            salt: salt,
        },
    )));
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});