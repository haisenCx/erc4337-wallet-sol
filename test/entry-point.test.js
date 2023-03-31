// const { describe, beforeEach, it } = require('mocha');
const {expect} = require("chai");
const {ethers, waffle} = require("hardhat");
const {arrayify} = require("@ethersproject/bytes");

const ETH = (value) => ethers.utils.parseEther(value);

function Log(msg) {
    console.log("\t" + msg);
}

function sendMainTokenCall(toAddress, amount) {
    // https://github.com/ethers-io/ethers.js/issues/478#issuecomment-495814010
    let ABI = ["function execute(address dest, uint256 value, bytes calldata func)"];
    let iface = new ethers.utils.Interface(ABI);
    return iface.encodeFunctionData("execute", [toAddress, amount, "0x"]);
}

// eslint-disable-next-line no-undef
describe("Send Token", function () {
    let sender, receiver, paymaster, addrs;

    let testERC20TokenFactory, testERC20Token;
    let entryPointFactory, entryPoint;
    let simpleAccountFactory, simpleAccount;

    // `beforeEach` will run before each test, re-deploying the contract every
    // time. It receives a callback, which can be async.
    // eslint-disable-next-line no-undef
    beforeEach(async function () {
        [sender, receiver, paymaster, ...addrs] = await ethers.getSigners();

        entryPointFactory = await ethers.getContractFactory("EntryPoint");
        entryPoint = await entryPointFactory.deploy();
        await entryPoint.deployed();
        Log("entryPoint contract address: " + entryPoint.address);

        testERC20TokenFactory = await ethers.getContractFactory("TestToken");
        testERC20Token = await testERC20TokenFactory.deploy();
        await testERC20Token.deployed();
        Log("test ERC20 token contract address: " + testERC20Token.address);

        simpleAccountFactory = await ethers.getContractFactory("SimpleAccount");
        simpleAccount = await simpleAccountFactory.deploy(entryPoint.address);
        await simpleAccount.deployed();
        Log("simpleAccount contract address: " + simpleAccount.address);


        // set wallet account owner
        let tx = await simpleAccount.initialize(sender.address);
        tx.wait();
    });

    // eslint-disable-next-line no-undef
    describe("Send Main Token", function () {

        /**
         * UserOperation {
         *      address sender;
         *      uint256 nonce;
         *      bytes initCode;
         *      bytes callData;
         *      uint256 callGasLimit;
         *      uint256 verificationGasLimit;
         *      uint256 preVerificationGas;
         *      uint256 maxFeePerGas;
         *      uint256 maxPriorityFeePerGas;
         *      bytes paymasterAndData;
         *      bytes signature;
         * }
         **/

        // eslint-disable-next-line no-undef
        it("Should transfer ETH success with not paymaster", async function () {
            // TODO paymaster address is a smart contract address
            // deposit to wallet account
            const depositAmount = ETH("1");
            const deposit = await sender.sendTransaction({
                to: simpleAccount.address, value: depositAmount,
            });
            await deposit.wait();
            const balance = await waffle.provider.getBalance(simpleAccount.address);
            expect(balance).to.eq(depositAmount);

            const transferAmount = ETH("0.01");

            const senderAddress = simpleAccount.address;
            const nonce = 0;
            const initCode = "0x";
            const callData = sendMainTokenCall(receiver.address, transferAmount);
            const callGasLimit = 210000;
            const verificationGasLimit = 210000;
            const preVerificationGas = 210000;
            const maxFeePerGas = 6000000000;
            const maxPriorityFeePerGas = 6000000000;
            const paymasterAndData = "0x";
            let signature = "0x";

            // get balance now
            const receiverBalance = await receiver.getBalance();

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
                [hash, entryPoint.address, chainId]);
            const userOpHash = ethers.utils.keccak256(packData);

            // sender sign UserOperator
            signature = await sender.signMessage(arrayify(userOpHash));

            // send tx to handleOps
            const params = [senderAddress, nonce, initCode, callData, callGasLimit, verificationGasLimit,
                preVerificationGas, maxFeePerGas, maxPriorityFeePerGas, paymasterAndData, signature];
            const handleOpsRes = await entryPoint.handleOps([params], sender.address);
            handleOpsRes.wait();

            // check receiver new balance whether increase or not
            const receiverNewBalance = await receiver.getBalance();
            expect(receiverNewBalance).to.equal(receiverBalance.add(transferAmount));
        });

        it("Should transfer ETH success with paymaster", async function () {
            // deposit to paymaster
            const depositAmount = ETH("1");
            const depositTx = await entryPoint.depositTo(paymaster.address, {value: depositAmount});
            await depositTx.wait();
            const balance = await entryPoint.balanceOf(paymaster.address);
            expect(balance).to.eq(depositAmount);

            const transferAmount = ETH("0.01");

            const senderAddress = simpleAccount.address;
            const nonce = 0;
            const initCode = "0x";
            const callData = sendMainTokenCall(receiver.address, transferAmount);
            const callGasLimit = 210000;
            const verificationGasLimit = 210000;
            const preVerificationGas = 210000;
            const maxFeePerGas = 6000000000;
            const maxPriorityFeePerGas = 6000000000;
            let paymasterAndData;
            let signature = "0x";

            // paymaster sign
            let paymasterSignPack = ethers.utils.defaultAbiCoder.encode(
                ["address", "uint256", "bytes", "bytes", "uint256", "uint256",
                    "uint256", "uint256", "uint256"],
                [senderAddress, nonce, initCode, callData, callGasLimit, verificationGasLimit,
                    preVerificationGas, maxFeePerGas, maxPriorityFeePerGas]);
            const paymasterSignPackHash = ethers.utils.keccak256(paymasterSignPack);
            const paymasterDataSign = await paymaster.signMessage(arrayify(paymasterSignPackHash));
            paymasterAndData = ethers.utils.defaultAbiCoder.encode(["bytes20", "bytes"],
                [paymaster.address, paymasterDataSign]);
            console.log("paymaster.address: " + paymaster.address);
            console.log("paymasterAndData: " + paymasterAndData);

            // get balance now
            const receiverBalance = await receiver.getBalance();

            // calculation UserOperation hash for sign
            let userOpPack = ethers.utils.defaultAbiCoder.encode(
                ["address", "uint256", "bytes", "bytes", "uint256", "uint256",
                    "uint256", "uint256", "uint256", "bytes", "bytes"],
                [senderAddress, nonce, initCode, callData, callGasLimit, verificationGasLimit,
                    preVerificationGas, maxFeePerGas, maxPriorityFeePerGas, paymasterAndData, signature]);
            // remove signature
            // userOpPack = userOpPack.substring(0, userOpPack.length - 64);
            const hash = ethers.utils.keccak256(userOpPack);
            const {chainId} = await ethers.provider.getNetwork();
            const packData = ethers.utils.defaultAbiCoder.encode(["bytes32", "address", "uint256"],
                [hash, entryPoint.address, chainId]);
            const userOpHash = ethers.utils.keccak256(packData);

            // sender sign UserOperator
            signature = await sender.signMessage(arrayify(userOpHash));

            // send tx to handleOps
            const params = [senderAddress, nonce, initCode, callData, callGasLimit, verificationGasLimit,
                preVerificationGas, maxFeePerGas, maxPriorityFeePerGas, paymasterAndData, signature];
            const handleOpsRes = await entryPoint.handleOps([params], sender.address);
            handleOpsRes.wait();

            // check receiver new balance whether increase or not
            const receiverNewBalance = await receiver.getBalance();
            expect(receiverNewBalance).to.equal(receiverBalance.add(transferAmount));
        });
    });

});