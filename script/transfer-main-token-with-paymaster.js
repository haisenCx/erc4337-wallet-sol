// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const {ethers} = require("hardhat");
const hre = require("hardhat");
const {arrayify} = require("@ethersproject/bytes");
const {expect} = require("chai");

const ETH = (value) => ethers.utils.parseEther(value);

const network_configs = {
    mumbai: {
        receiver_address: "0xF5054F94009B7E9999F6459f40d8EaB1A2ceA22D",
        send_amount: ETH("0.001"),
        contract_address: {
            entry_point: "0x6FdC82b4500b5B82504DaA465B8CDB9E9dBC48Ef",
            simple_account_factory: "0x6ACF75E7EA53E85fb97ee62575B4410c27346dDE",
            simple_account: "0xE737Aae2cbaECc8B0Aad0D7268CCc16a205966b9",
            // simple_account: "0xef1c4b4a77F604C79AB74A7AB79103C473cDEB1C",
            token_paymaster: "0xa83C860681d4da28154c225a985aA0C5a5F7E8ED",
        }
    }, ethereum: {},
}

let config;

function sendMainTokenCall(toAddress, amount) {
    // https://github.com/ethers-io/ethers.js/issues/478#issuecomment-495814010
    let ABI = ["function execute(address dest, uint256 value, bytes calldata func)"];
    let iface = new ethers.utils.Interface(ABI);
    return iface.encodeFunctionData("execute", [toAddress, amount, "0x"]);
}

async function main() {
    // Hardhat always runs the compile task when running scripts with its command
    // line interface.
    //
    // If this script is run directly using `node` you may want to call compile
    // manually to make sure everything is compiled
    // await hre.run('compile');

    // We get the Assets contract to deploy

    if (hre.network.name === "mumbai") {
        config = network_configs.mumbai
    } else {
        config = network_configs.ethereum
    }

    console.log("Network:", hre.network.name)

    let [addr, ...addrs] = await ethers.getSigners();
    console.log("address: " + addr.address);

    const entryPointFactory = await ethers.getContractFactory("EntryPoint");
    const entryPoint = await entryPointFactory.attach(config.contract_address.entry_point);

    const simpleAccountFactory = await ethers.getContractFactory("SimpleAccount");
    const simpleAccount = await simpleAccountFactory.attach(config.contract_address.simple_account);
    const _nonce = "0";
    // const _nonce = await simpleAccount.nonce();

    const senderAddress = config.contract_address.simple_account;
    const nonce = _nonce.toString();
    const initCode = "0x";
    const callData = sendMainTokenCall(config.receiver_address, config.send_amount);
    const callGasLimit = 210000;
    const verificationGasLimit = 210000;
    const preVerificationGas = 210000;
    const maxFeePerGas = 2250000024;
    const maxPriorityFeePerGas = 2250000024;
    let paymasterAndData;
    let signature = "0x";

    // paymaster sign
    let paymasterSignPack = ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "bytes", "bytes", "uint256", "uint256",
            "uint256", "uint256", "uint256"],
        [senderAddress, nonce, initCode, callData, callGasLimit, verificationGasLimit,
            preVerificationGas, maxFeePerGas, maxPriorityFeePerGas]);
    const paymasterSignPackHash = ethers.utils.keccak256(paymasterSignPack);
    const paymasterDataSign = await addr.signMessage(arrayify(paymasterSignPackHash));
    paymasterAndData = ethers.utils.defaultAbiCoder.encode(
        ["bytes20", "bytes"],
        [config.contract_address.token_paymaster, paymasterDataSign]);

    // calculation UserOperation hash for sign
    let userOpPack = ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256", "bytes", "bytes", "uint256", "uint256",
            "uint256", "uint256", "uint256", "bytes", "bytes"],
        [senderAddress, nonce, initCode, callData, callGasLimit, verificationGasLimit,
            preVerificationGas, maxFeePerGas, maxPriorityFeePerGas, paymasterAndData, signature]);
    // remove signature
    userOpPack = userOpPack.substring(0, userOpPack.length - 64);
    const hash = ethers.utils.keccak256(userOpPack);
    const {chainId} = await ethers.provider.getNetwork();
    const packData = ethers.utils.defaultAbiCoder.encode(["bytes32", "address", "uint256"],
        [hash, config.contract_address.entry_point, chainId]);
    const userOpHash = ethers.utils.keccak256(packData);

    // sender sign UserOperator
    signature = await addr.signMessage(arrayify(userOpHash));

    // send tx to handleOps
    const params = [senderAddress, nonce, initCode, callData, callGasLimit, verificationGasLimit,
        preVerificationGas, maxFeePerGas, maxPriorityFeePerGas, paymasterAndData, signature];
    console.log("Params: " + params.toString());

    // const handleOpsRes = await entryPoint.handleOps([params], addr.address);
    // handleOpsRes.wait();
    // console.log("handleOpsRes tx hash: " + handleOpsRes.hash);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});