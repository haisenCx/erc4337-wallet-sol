// const { describe, beforeEach, it } = require('mocha');
const {expect} = require("chai");
const {ethers, waffle, artifacts} = require("hardhat");
const {arrayify} = require("@ethersproject/bytes");
const {address} = require("hardhat/internal/core/config/config-validation");

const ETH = (value) => ethers.utils.parseEther(value);
const Token = (value) => ethers.utils.parseEther(value);

function Log(msg) {
    console.log("\t" + msg);
}

async function getBytecode(contractName) {
    const contract = await artifacts.readArtifactSync(contractName);
    return contract.bytecode;
}

function sendMainTokenCall(toAddress, amount) {
    // https://github.com/ethers-io/ethers.js/issues/478#issuecomment-495814010
    let ABI = ["function execute(address dest, uint256 value, bytes calldata func)"];
    let iface = new ethers.utils.Interface(ABI);
    return iface.encodeFunctionData("execute", [toAddress, amount, "0x"]);
}

function simpleAccountFactoryCreateAccountCall(ownerAddress, salt) {
    // https://github.com/ethers-io/ethers.js/issues/478#issuecomment-495814010
    let ABI = ["function createAccount(address owner, uint salt)"];
    let iface = new ethers.utils.Interface(ABI);
    return iface.encodeFunctionData("createAccount", [ownerAddress, salt]);
}

function simpleAccountFactoryGetAddressCall(ownerAddress, salt) {
    // https://github.com/ethers-io/ethers.js/issues/478#issuecomment-495814010
    let ABI = ["function getAddress(address owner, uint salt)"];
    let iface = new ethers.utils.Interface(ABI);
    return iface.encodeFunctionData("getAddress", [ownerAddress, salt]);
}

// eslint-disable-next-line no-undef
describe("Send Token", function () {
    let sender, receiver, paymaster, bundler, addrs;

    let testERC20TokenFactory, testERC20Token;
    let entryPointFactory, entryPoint;
    let simpleAccountFFactory, simpleAccountF;
    let simpleAccountFactory, simpleAccount;
    let tokenPaymasterFactory, tokenPaymaster;

    // `beforeEach` will run before each test, re-deploying the contract every
    // time. It receives a callback, which can be async.
    // eslint-disable-next-line no-undef
    beforeEach(async function () {
        [sender, receiver, paymaster, bundler, ...addrs] = await ethers.getSigners();
        Log("sender address: " + sender.address);
        Log("receiver address: " + receiver.address);
        Log("paymaster address: " + paymaster.address);
        Log("bundler address: " + bundler.address);

        entryPointFactory = await ethers.getContractFactory("EntryPoint");
        entryPoint = await entryPointFactory.deploy();
        await entryPoint.deployed();
        Log("EntryPoint contract address: " + entryPoint.address);

        testERC20TokenFactory = await ethers.getContractFactory("TestToken");
        testERC20Token = await testERC20TokenFactory.deploy();
        await testERC20Token.deployed();
        Log("TestToken ERC20 contract address: " + testERC20Token.address);

        simpleAccountFFactory = await ethers.getContractFactory("SimpleAccountFactory");
        simpleAccountF = await simpleAccountFFactory.deploy(entryPoint.address);
        await simpleAccountF.deployed();
        Log("SimpleAccountFactory contract address: " + simpleAccountF.address);

        simpleAccountFactory = await ethers.getContractFactory("SimpleAccount");
        simpleAccount = await simpleAccountFactory.deploy(entryPoint.address);
        await simpleAccount.deployed();
        Log("SimpleAccount contract address: " + simpleAccount.address);
        // set wallet account owner
        await simpleAccount.initialize(sender.address);

        tokenPaymasterFactory = await ethers.getContractFactory("TokenPaymaster");
        tokenPaymaster = await tokenPaymasterFactory.deploy(
            simpleAccountF.address, "USDTPM", entryPoint.address);
        await tokenPaymaster.deployed();
        Log("tokenPaymaster contract address: " + tokenPaymaster.address);

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
            // deposit to wallet account
            const depositAmount = ETH("1");
            const deposit = await sender.sendTransaction({
                to: simpleAccount.address, value: depositAmount,
            });
            await deposit.wait();
            const balance = await waffle.provider.getBalance(simpleAccount.address);
            expect(balance).to.eq(depositAmount);

            const transferAmount = ETH("0.1");

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
            // const simulateValidationRes = await entryPoint.simulateValidation(params, {gasLimit: 100000});

            // eventLog = simulateHandleOpRes.events.find((event) => event.event === "ExecutionResult");
            // [_sender, _babyIndex, _status, _] = eventLog.args;
            // console.log("_sender:" + _sender);

            const handleOpsRes = await entryPoint.handleOps([params], sender.address);
            handleOpsRes.wait();

            // check receiver new balance whether increase or not
            const receiverNewBalance = await receiver.getBalance();
            expect(receiverNewBalance).to.equal(receiverBalance.add(transferAmount));
        });

        it("Should transfer ETH success with paymaster", async function () {
            const depositETHAmount = ETH("1");
            const depositTokenAmount = Token("1000");
            // deposit to wallet account
            const deposit = await sender.sendTransaction({
                to: simpleAccount.address, value: depositETHAmount,
            });
            await deposit.wait();
            const walletETHBalance = await waffle.provider.getBalance(simpleAccount.address);
            expect(walletETHBalance).to.eq(depositETHAmount);

            // deposit to paymaster
            const depositTx = await entryPoint.depositTo(tokenPaymaster.address, {value: depositETHAmount});
            await depositTx.wait();
            const balance = await entryPoint.balanceOf(tokenPaymaster.address);
            expect(balance).to.eq(depositETHAmount);

            // mint token to wallet
            await tokenPaymaster.mintTokens(simpleAccount.address, depositTokenAmount);
            const walletTokenBalance = await tokenPaymaster.balanceOf(simpleAccount.address);
            expect(walletTokenBalance).to.eq(depositTokenAmount);

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
            // 测试的TokenPaymaster不包含验证逻辑，所以签名没有进行验证
            const paymasterDataSign = await paymaster.signMessage(arrayify(paymasterSignPackHash));
            paymasterAndData = ethers.utils.defaultAbiCoder.encode(
                ["bytes20", "bytes"],
                [tokenPaymaster.address, paymasterDataSign]);

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

            // get balance now
            const senderETHBalance = await sender.getBalance();
            const bundlerBalance = await bundler.getBalance();
            const tokenPaymasterTokenBalance = await tokenPaymaster.balanceOf(tokenPaymaster.address);

            // send tx to handleOps
            const params = [senderAddress, nonce, initCode, callData, callGasLimit, verificationGasLimit,
                preVerificationGas, maxFeePerGas, maxPriorityFeePerGas, paymasterAndData, signature];
            // const simulateValidationRes = await entryPoint.connect(bundler).simulateValidation(params, {gasLimit: 100000});
            // const simulateValidationRes = await entryPoint.simulateValidation(params, {gasLimit: 100000});

            // console.log("simulateValidationRes:", simulateValidationRes);
            // await expect(await entryPoint.connect(bundler).simulateValidation(params).to.be.revertedWith('ValidationResult'));
            // console.log("simulateValidationRes:" + simulateValidationRes);

            await entryPoint.connect(bundler).handleOps([params], bundler.address);

            // check receiver new balance whether increase or not
            expect(await sender.getBalance()).to.equal(senderETHBalance);


            // gas fee cost from wallet account, so it's reduce
            expect(await tokenPaymaster.balanceOf(simpleAccount.address)).to.lt(depositTokenAmount);

            expect(await tokenPaymaster.balanceOf(tokenPaymaster.address)).to.gt(tokenPaymasterTokenBalance);
            expect(await bundler.getBalance()).to.gt(bundlerBalance);
        });
    });

});


describe("Account Management", function () {
    let sender, receiver, paymaster, bundler, addrs;

    let testERC20TokenFactory, testERC20Token;
    let entryPointFactory, entryPoint;
    let simpleAccountFFactory, simpleAccountF;
    let simpleAccountFactory, simpleAccount;
    let tokenPaymasterFactory, tokenPaymaster;

    // `beforeEach` will run before each test, re-deploying the contract every
    // time. It receives a callback, which can be async.
    // eslint-disable-next-line no-undef
    beforeEach(async function () {
        [sender, receiver, paymaster, bundler, ...addrs] = await ethers.getSigners();
        Log("sender address: " + sender.address);
        Log("receiver address: " + receiver.address);
        Log("paymaster address: " + paymaster.address);
        Log("bundler address: " + bundler.address);

        entryPointFactory = await ethers.getContractFactory("EntryPoint");
        entryPoint = await entryPointFactory.deploy();
        await entryPoint.deployed();
        Log("EntryPoint contract address: " + entryPoint.address);

        testERC20TokenFactory = await ethers.getContractFactory("TestToken");
        testERC20Token = await testERC20TokenFactory.deploy();
        await testERC20Token.deployed();
        Log("TestToken ERC20 contract address: " + testERC20Token.address);

        simpleAccountFFactory = await ethers.getContractFactory("SimpleAccountFactory");
        simpleAccountF = await simpleAccountFFactory.deploy(entryPoint.address);
        await simpleAccountF.deployed();
        Log("SimpleAccountFactory contract address: " + simpleAccountF.address);

        simpleAccountFactory = await ethers.getContractFactory("SimpleAccount");
        simpleAccount = await simpleAccountFactory.deploy(entryPoint.address);
        await simpleAccount.deployed();
        Log("SimpleAccount contract address: " + simpleAccount.address);
        // set wallet account owner
        await simpleAccount.initialize(sender.address);

        tokenPaymasterFactory = await ethers.getContractFactory("TokenPaymaster");
        tokenPaymaster = await tokenPaymasterFactory.deploy(
            simpleAccountF.address, "USDTPM", entryPoint.address);
        await tokenPaymaster.deployed();
        Log("tokenPaymaster contract address: " + tokenPaymaster.address);

    });

    // eslint-disable-next-line no-undef
    describe("Create a new contract wallet", function () {

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
        it("Should create a new contract wallet by simpleAccountFactory", async function () {
            await simpleAccountF.createAccount(sender.address, 1);
            const addr = await simpleAccountF.getAddress(sender.address, 1);
            const walletOwner = await simpleAccount.connect(addr).owner();
            expect(walletOwner).to.eq(sender.address);
        })

        it("Should create a new contract wallet by bundler", async function () {
            // deposit to wallet account
            const depositAmount = ETH("1");
            const deposit = await sender.sendTransaction({
                to: simpleAccount.address, value: depositAmount,
            });
            await deposit.wait();
            const balance = await waffle.provider.getBalance(simpleAccount.address);
            expect(balance).to.eq(depositAmount);

            const initCode = ethers.utils.solidityPack(
                ['bytes20', 'bytes'],
                [ethers.utils.arrayify(simpleAccountF.address), ethers.utils.arrayify(simpleAccountFactoryCreateAccountCall(sender.address, 1))]
            );

            const senderCreatorFactory = await ethers.getContractFactory("SenderCreator");
            const senderCreator = await senderCreatorFactory.deploy();
            await senderCreator.deployed();

            await senderCreator.connect(bundler).createSender(initCode);
            const walletAddress = await simpleAccountF.getAddress(sender.address, 1);
            expect(await simpleAccount.connect(walletAddress).owner()).to.eq(sender.address);
            expect(walletAddress).to.not.eq(ethers.constants.AddressZero);

        });

    });

});