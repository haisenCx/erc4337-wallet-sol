const erc20Abi = require('./data/IERC20.json');
const { arrayify } = require("@ethersproject/bytes");
const { BigNumber } = require("@ethersproject/bignumber");
const { ethers } = require('hardhat');
const networkConfigs = require('./config');

function getConfig() {
    const networkName = hre.network.name
    console.log("Network:", networkName, "configs:", networkConfigs);

    const config = networkConfigs[networkName];
    if (!config) {
        throw new Error(`No configuration found for network: ${networkName}`);
    }
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
    const smarterAccountV1Factory = await ethers.getContractFactory("SmarterAccountV1");
    const smarterAccountV1 = await smarterAccountV1Factory.attach(ethers.constants.AddressZero);
    return smarterAccountV1.interface.encodeFunctionData(method, params);
}


/**
 * 发送交易，调用合约
 */
async function sendTxCallContract(hardhatObject, erc4337Object, contractCalls) {
    const { signer } = hardhatObject;
    const senderAddress = erc4337Object.senderAddress;
    const nonce = erc4337Object.nonce;
    const tokenPaymasterAddress = erc4337Object.gasfee.tokenPayMasterAddress;
    const gasfeePayerAddress = erc4337Object.gasfee.payGasfeeTokenAddress;
    const gasPrice = erc4337Object.gasfee.gasPrice;
    const entryPointAddress = erc4337Object.entrypoint.address;
    const initCode = erc4337Object.initCode;
    // ERC20 token payment contract, which needs to be authorized first
    const approveZeroCallData = contractCall(erc20Abi, "approve", [tokenPaymasterAddress, 0]);
    const approveMaxCallData = contractCall(erc20Abi, "approve", [tokenPaymasterAddress, ethers.constants.MaxUint256]);
    // Assemble the contract data of the call
    const execcteBatchAddress = [gasfeePayerAddress, gasfeePayerAddress];
    const execcteBatchValue = [BigNumber.from(0), BigNumber.from(0)];
    const execcteBatchCallData = [approveZeroCallData, approveMaxCallData];

    for (const contractCallParams of contractCalls) {
        const { ethValue, callContractAbi, callContractAddress, callFunc, callParams } = contractCallParams;
        // Assemble the contract data of the call
        execcteBatchAddress.push(callContractAddress);
        execcteBatchValue.push(ethValue);
        const callTxData = contractCall(callContractAbi, callFunc, callParams);
        execcteBatchCallData.push(callTxData);
    }
    const callData = await smarterAccountCall('executeBatch(address[],uint256[],bytes[])', [
        execcteBatchAddress,
        execcteBatchValue,
        execcteBatchCallData,
    ]);
    // build UserOperation
    return await buildTx(signer, senderAddress, nonce, initCode, callData, tokenPaymasterAddress, entryPointAddress, gasPrice);
}


async function isContractAddress(address) {
    const code = await ethers.provider.getCode(address);
    return code !== '0x';
}


/**
 * USDC token paymaster
 */
async function sendTxTransferERC20TokenWithUSDCPay(hardhatObject, erc4337Object, txObject) {
    erc4337Object.initCode = "0x";
    let op = await sendTxCallContract(
        hardhatObject,
        erc4337Object,
        [{
            ethValue: '0',
            callContractAddress: txObject.contractAddress,
            callContractAbi: erc20Abi,
            callFunc: 'transfer',
            callParams: [txObject.receiverAddress, txObject.amount],
        }]
    );
    return await sendUserOperation(op, erc4337Object.entrypoint.address);
}

/**
 * Create wallet
 */
async function sendTxCreateWallet(hardhatObject, erc4337Object, txObject) {
    const { accountFactoryAddress, salt } = txObject;
    erc4337Object.initCode = getInitCode(accountFactoryAddress, hardhatObject.signer.address, salt);
    let op = await sendTxCallContract(hardhatObject, erc4337Object, []);
    return await sendUserOperation(op, erc4337Object.entrypoint.address);
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

module.exports = {
    verifyOnBlockscan,
    sendMainTokenCall,
    sendTxTransferERC20TokenWithUSDCPay,
    isContractAddress,
    getConfig,
    sendTxCreateWallet,
};