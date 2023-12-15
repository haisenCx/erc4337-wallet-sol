const erc20Abi = require('./data/IERC20.json');
const { arrayify } = require("@ethersproject/bytes");
const { BigNumber } = require("@ethersproject/bignumber");
const { ethers } = require('hardhat');

const networkConfigs = {
    mumbai: {
        contractAddress: {
            entryPoint: "0xD79b0817A1Aeb55042d7b10bD25f99F17239333a",
            smarterV1Factory: "0x57811fb5ea260740244fc81f421a5Ca156c78060",
            usdcPaymaster: "0x0F1499cBB313492a164e93f2c5a35a35246d030E",
            swtPaymaster: "0x4B63443E5eeecE233AADEC1359254c5C601fB7f4",
            usdc: "0x9999f7Fea5938fD3b1E26A12c3f2fb024e194f97",
            uswt: "0xF981Ac497A0fe7ad2Dd670185c6e7D511Bf36d6d",
        }
    }
};

function getConfig() {
    console.log("networkConfigs:", networkConfigs)
    config = networkConfigs[hre.network.name]
    console.log("Network:", hre.network.name);
    console.log("Config:", config);
    return config;
}

function getInitCode(factoryAddress, owner, salt) {
    const iface = new ethers.utils.Interface(["function createAccount(address owner, uint salt) "]);
    const initCallData = iface.encodeFunctionData("createAccount", [owner, salt]);
    return factoryAddress + initCallData.slice(2);
}

function sendMainTokenCall(toAddress, amount) {
    // https://github.com/ethers-io/ethers.js/issues/478#issuecomment-495814010
    let ABI = ["function execute(address dest, uint256 value, bytes calldata func)"];
    let iface = new ethers.utils.Interface(ABI);
    return iface.encodeFunctionData("execute", [toAddress, amount, "0x"]);
}


async function buildTx(signer, senderAddress, nonce, initCode, callData, tokenPaymasterAddress, entryPointAddress, gasPrice,) {

    // TODO The way in which parameters are determined needs to be discussed
    const callGasLimit = 500000;
    const verificationGasLimit = 500000;
    const preVerificationGas = 500000;
    const maxFeePerGas = gasPrice;
    const maxPriorityFeePerGas = gasPrice;
    let paymasterAndData;
    let signature = '0x';

    // paymaster sign
    let paymasterSignPack = ethers.utils.defaultAbiCoder.encode(
        ['address', 'uint256', 'bytes', 'bytes', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256'],
        [
            senderAddress,
            nonce,
            initCode,
            callData,
            callGasLimit,
            verificationGasLimit,
            preVerificationGas,
            maxFeePerGas,
            maxPriorityFeePerGas,
        ],
    );
    const paymasterSignPackHash = ethers.utils.keccak256(paymasterSignPack);
    console.log("paymasterSignPackHash:", paymasterSignPackHash);
    // The tested TokenPaymaster did not contain verification logic, so the signature was not verified
    const paymasterDataSign = await signer.signMessage(arrayify(paymasterSignPackHash));
    paymasterAndData = ethers.utils.defaultAbiCoder.encode(
        ['bytes20', 'bytes'],
        [tokenPaymasterAddress, paymasterDataSign],
    );

    // calculation UserOperation hash for sign
    let userOpPack = ethers.utils.defaultAbiCoder.encode(
        ['address', 'uint256', 'bytes', 'bytes', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'bytes', 'bytes'],
        [
            senderAddress,
            nonce,
            initCode,
            callData,
            callGasLimit,
            verificationGasLimit,
            preVerificationGas,
            maxFeePerGas,
            maxPriorityFeePerGas,
            paymasterAndData,
            signature,
        ],
    );
    // remove signature
    userOpPack = userOpPack.substring(0, userOpPack.length - 64);
    const hash = ethers.utils.keccak256(userOpPack);
    const { chainId } = await ethers.provider.getNetwork();
    const packData = ethers.utils.defaultAbiCoder.encode(
        ['bytes32', 'address', 'uint256'],
        [hash, entryPointAddress, chainId],
    );
    const userOpHash = ethers.utils.keccak256(packData);

    // sender sign UserOperator
    signature = await signer.signMessage(arrayify(userOpHash));

    const userOperation = {
        sender: senderAddress,
        nonce: nonce.toString(),
        initCode: initCode,
        callData: callData,
        callGasLimit: callGasLimit.toString(),
        verificationGasLimit: verificationGasLimit.toString(),
        preVerificationGas: preVerificationGas.toString(),
        maxFeePerGas: maxFeePerGas.toString(),
        maxPriorityFeePerGas: maxPriorityFeePerGas.toString(),
        paymasterAndData: paymasterAndData,
        signature: signature,
    };
    return userOperation;
}

/**
 * Bundelr API
 */
async function sendUserOperation(op, entryPointAddress) {
    // TODO
    return {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "eth_sendUserOperation",
        "params": [
            op,
            entryPointAddress
        ]
    };
}

function contractCall(abi, method, params = []) {
    let iface = new ethers.utils.Interface(abi);
    return iface.encodeFunctionData(method, params);
}

async function smarterAccountCall(method, params = []) {
    console.log("smarterAccountCall, method:", method, "params:", params);
    const smarterAccountV1Factory = await ethers.getContractFactory("SmarterAccountV1");
    const smarterAccountV1 = await smarterAccountV1Factory.attach(ethers.constants.AddressZero);
    return smarterAccountV1.interface.encodeFunctionData(method, params);
}


/**
 * 发送交易，调用合约
 * @param entryPointAddress
 * @param tokenPaymasterAddress
 * @param gasPrice
 * @param ethValue 交易发送ETH数量，单纯调合约时为0
 * @param callContractAbi 调用的合约ABI文件
 * @param callContractAddress 调用的合约地址
 * @param callFunc 调用的方法
 * @param callParams 调用参数
 * @returns
 */
async function sendTxCallContract(
    signer, senderAddress, nonce,
    entryPointAddress,
    gasfeePayerAddress,
    tokenPaymasterAddress,
    gasPrice,
    initCode,
    contractCalls,
) {
    console.log("sendTxCallContract");
    // ERC20 token 代付合约，需要先授权
    const approveZeroCallData = contractCall(erc20Abi, "approve", [tokenPaymasterAddress, 0]);
    const approveMaxCallData = contractCall(erc20Abi, "approve", [tokenPaymasterAddress, ethers.constants.MaxUint256]);
    // 组装调用的合约数据
    const execcteBatchAddress = [gasfeePayerAddress, gasfeePayerAddress];
    const execcteBatchValue = [BigNumber.from(0), BigNumber.from(0)];
    const execcteBatchCallData = [approveZeroCallData, approveMaxCallData];

    for (const contractCallParams of contractCalls) {
        console.log("contractCallParams:", contractCallParams);
        const { ethValue, callContractAbi, callContractAddress, callFunc, callParams } = contractCallParams;
        // 组装钱包合约调用数据
        execcteBatchAddress.push(callContractAddress);
        execcteBatchValue.push(ethValue);
        const callTxData = contractCall(callContractAbi, callFunc, callParams);
        console.log("callTxData:", callTxData);
        execcteBatchCallData.push(callTxData);
    }
    const callData = await smarterAccountCall('executeBatch(address[],uint256[],bytes[])', [
        execcteBatchAddress,
        execcteBatchValue,
        execcteBatchCallData,
    ]);
    console.log("smarterAccountCall callData:", callData);
    // 构建UserOperation
    return await buildTx(signer, senderAddress, nonce, initCode, callData, tokenPaymasterAddress, entryPointAddress, gasPrice);
}

async function verifyOnBlockscan(address, args = [], contractPath) {
    let success = false;
    while (!success) {
        try {
            let params = {
                address: address,
                constructorArguments: args,
            };
            if (contractPath != null) {
                params["contract"] = contractPath;
            }
            await hre.run("verify:verify", params);
            console.log("verify successfully");
            success = true;
        } catch (error) {
            console.log(`Script failed: ${error}`);
            console.log(`Trying again in 3 seconds...`);
            await new Promise((resolve) => setTimeout(resolve, 3000));
        }
    }
}


async function isContractAddress(address) {
    const code = await ethers.provider.getCode(address);
    return code !== '0x';
}


/**
 * USDC token paymaster
 */
async function sendTxTransferERC20TokenWithUSDCPay(
    signer, senderAddress, nonce,
    tokenPaymasterAddress,
    entryPointAddress,
    gasfeePayerAddress,
    gasPrice,
    callContractAddress,
    sendTokenAmount,
    receiverAddress,
) {
    let op = await sendTxCallContract(signer, senderAddress, nonce, entryPointAddress, gasfeePayerAddress, tokenPaymasterAddress, gasPrice, "0x", [
        {
            ethValue: '0',
            callContractAbi: erc20Abi,
            callContractAddress: callContractAddress,
            callFunc: 'transfer',
            callParams: [receiverAddress, sendTokenAmount],
        },
    ]);
    return await sendUserOperation(op, entryPointAddress);
}

async function sendTxCreateWallet(
    signer, 
    senderAddress, nonce,
    tokenPaymasterAddress,
    entryPointAddress,
    gasfeePayerAddress,
    gasPrice,
    factoryAddress, salt,
) {
    const initCode = getInitCode(factoryAddress, signer.address, salt)
    let op = await sendTxCallContract(signer, senderAddress, nonce, entryPointAddress, gasfeePayerAddress, tokenPaymasterAddress, gasPrice, initCode, []);
    return await sendUserOperation(op, entryPointAddress);
}

module.exports = {
    networkConfigs,
    verifyOnBlockscan,
    sendMainTokenCall,
    sendTxTransferERC20TokenWithUSDCPay,
    isContractAddress,
    getConfig,
    sendTxCreateWallet,
};