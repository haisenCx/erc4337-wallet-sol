// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { ethers } = require("hardhat");
const hre = require("hardhat");
const { arrayify } = require("@ethersproject/bytes");
const { expect } = require("chai");

const ETH = (value) => ethers.utils.parseEther(value);

const network_configs = {
    mumbai: {
        receiver_address: "0xF5054F94009B7E9999F6459f40d8EaB1A2ceA22D",
        send_amount: ETH("0.001"),
        contract_address: {
            entry_point: "0x6FdC82b4500b5B82504DaA465B8CDB9E9dBC48Ef",
            simple_account_factory: "0xA02867e1b8410a810Ca3b4875A7A33C89846Ea10",
            simple_account: "0x862941F2381E28b4074EB341E7c8cD68Dd31883e",
            token_paymaster: "0x4B63443E5eeecE233AADEC1359254c5C601fB7f4",
        }
    }, ethereum: {},
}

let config;

function createWallet(address, nonce) {
    let ABI = ["function createAccount(address owner,uint256 salt)"];
    let iface = new ethers.utils.Interface(ABI);
    return iface.encodeFunctionData("createAccount", [address, nonce]);
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

    const simpleAccountFactoryFactory = await ethers.getContractFactory("SimpleAccountFactory");
    const simpleAccountFactory = await simpleAccountFactoryFactory.attach(config.contract_address.simple_account_factory);
    
    const simpleAccountFactory1 = await ethers.getContractFactory("SimpleAccount");
    const simpleAccount = await simpleAccountFactory1.attach(config.contract_address.simple_account);
    // const _nonce = await simpleAccount.nonce();

    const ownerAddress = addr.address;
    const senderAddress = simpleAccount.address;
    const nonce = "0";
    // const nonce = _nonce.toString();
    const initCodeContractAddress = simpleAccountFactory.address;

    // 使用ethers.js的Interface对象来编码调用数据
    const createWalletOwner = "0x5134F00C95b8e794db38E1eE39397d8086cee7Ed";
    const createWalletNonce = 1;
    const initCodeParams = createWallet(createWalletOwner, createWalletNonce);
    const initCode = `0x${config.contract_address.simple_account_factory.toLowerCase().replace('0x', '')}${initCodeParams.toLowerCase().replace('0x', '')}`;

    const callData = "0x";
    const callGasLimit = 1500000;
    const verificationGasLimit = 1500000;
    const preVerificationGas = 1500000;
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
    const { chainId } = await ethers.provider.getNetwork();
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