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
            entry_point: "0x081d5B6e93B686cEA78B87f5f96Ec274cC6FFe41",
            simple_account_factory: "0xA02867e1b8410a810Ca3b4875A7A33C89846Ea10",
            simple_account: "0x9dAe3774084DC7Ef4Bed463B369F568EF7D84E42",
            // simple_account: "0xef1c4b4a77F604C79AB74A7AB79103C473cDEB1C",
            token_paymaster: "0xa83C860681d4da28154c225a985aA0C5a5F7E8ED",
            usdc_paymaster:"0x8B9aB3DBf47FFb15815e895A2953254027C7E6CC"
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
        [config.contract_address.usdc_paymaster, paymasterDataSign]);

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
    /**
     *  "0xE737Aae2cbaECc8B0Aad0D7268CCc16a205966b9","0","0x","0xb61d27f6000000000000000000000000f5054f94009b7e9999f6459f40d8eab1a2cea22d00000000000000000000000000000000000000000000000000038d7ea4c6800000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000000","210000","210000","210000","2250000024","2250000024","0xeb869abba30c92738748519fade85d49f85655b400000000000000000000000000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000041fe8cad7cd241f8cebd41a286ef5f1611baf1516f10c9224501d1213c508c499f0058d88a6634d9c32d5e5e1b1906beef4d5e78df8c8cd9cbf70e0f44159f82841b00000000000000000000000000000000000000000000000000000000000000","0x773bda426101eb5b377a90849d49faf5fcdcfe3c10e0c84032a59e982e62d0f37f123f5e1b5bc7717a9122e06dcd8d39d9319b82d55e1a5485ab60e4a12414751b"
     */
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