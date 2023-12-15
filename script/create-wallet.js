const { ethers } = require("hardhat");
const utils = require("./utils");

async function main() {
  
    let config = utils.getConfig();

    let [addr, ...addrs] = await ethers.getSigners();
    console.log("address: " + addr.address);

    const salt = 1;

    const smarterAccountV1FactoryF = await ethers.getContractFactory("SmarterAccountV1Factory");
    const smarterAccountV1FactoryContract = await smarterAccountV1FactoryF.attach(config.contractAddress.smarterV1Factory);

    const smarterAccountAddress = smarterAccountV1FactoryContract.getAddress(addr.address, salt);

    const smarterAccountV1Factory = await ethers.getContractFactory("SmarterAccountV1");
    const smarterAccountV1 = await smarterAccountV1Factory.attach(smarterAccountAddress);

    const senderAddress = await smarterAccountV1.address;
    console.log("Sender Address: %s", senderAddress);

    const gasPrice = await hre.ethers.provider.getGasPrice();

    console.log(JSON.stringify(await utils.sendTxCreateWallet(
        addr, senderAddress, "0",
        config.contractAddress.usdcPaymaster,
        config.contractAddress.entryPoint,
        config.contractAddress.usdc,
        gasPrice,
        config.contractAddress.smarterV1Factory, salt,
    )));
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});