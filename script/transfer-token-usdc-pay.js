const { ethers } = require("hardhat");
const hre = require("hardhat");
const utils = require("./utils");

async function main() {

    let config = utils.getConfig();

    let [addr, ...addrs] = await ethers.getSigners();
    console.log("Address: %s", addr.address);

    const smarterAccountV1FactoryF = await ethers.getContractFactory("SmarterAccountV1Factory");
    const smarterAccountV1FactoryContract = await smarterAccountV1FactoryF.attach(config.contractAddress.smarterV1Factory);

    const smarterAccountAddress = smarterAccountV1FactoryContract.getAddress(addr.address, 0);

    const smarterAccountV1Factory = await ethers.getContractFactory("SmarterAccountV1");
    const smarterAccountV1 = await smarterAccountV1Factory.attach(smarterAccountAddress);

    const senderAddress = await smarterAccountV1.address;
    console.log("Sender Address: %s", senderAddress);

    let nonce = "0";
    if (await utils.isContractAddress(senderAddress)) {
        console.log("Sender is contract address");
        const _nonce = await smarterAccountV1.nonce();
        nonce = _nonce.toString();
    }

    const gasPrice = await hre.ethers.provider.getGasPrice();

    const op = await utils.sendTxTransferERC20TokenWithUSDCPay(
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
            // ERC20 tx contract address
            contractAddress: config.contractAddress.usdc,
            // ERC20 tx transfer token to address
            receiverAddress: "0x5134F00C95b8e794db38E1eE39397d8086cee7Ed",
            // ERC20 tx transfer token amount
            amount: 100,
        },
    );
    console.log(JSON.stringify(op));
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});