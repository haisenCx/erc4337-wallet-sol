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
        receiver_address: "0x383b2aA0fCB6dd340CF01a5B3F32739719d0f77F",
        send_amount: ETH("0.001"),
        contract_address: {
            entry_point: "0x081d5B6e93B686cEA78B87f5f96Ec274cC6FFe41",
            simple_account_factory: "0x07A7c967c36d1a5A660da4E4035c2A61Ca6c0205",
            simple_account: "0x7A54E27B06D0748AB6778Cd87A2199da01C6725B",
            // simple_account: "0xef1c4b4a77F604C79AB74A7AB79103C473cDEB1C",
            token_paymaster: "0x263b6054c4135D47e20fa9D01E9Eb87A0305d022",
            usdc_paymaster: "0x263b6054c4135D47e20fa9D01E9Eb87A0305d022"
        }
    }, fuji: {
        receiver_address: "0x383b2aA0fCB6dd340CF01a5B3F32739719d0f77F",
        send_amount: ETH("0.001"),
        contract_address: {
            entry_point: "0xF7107A9DAF81d5126858aAd0a561FF03945ff1dD",
            simple_account_factory: "0xc2923f0042Cc18034F4C780c1Ee306636f812201",
            // simple_account: "0x8A1cf359BAc29Fb6e8691dBCEe890b7ECbC55449",
            // simple_account: "0xef1c4b4a77F604C79AB74A7AB79103C473cDEB1C",
            simple_account: "0x339ECE10d95FbB7182609bE289F26019CC7f7f33",
            token_paymaster: "0x480DaAC57da548f3349DBDBE80033Ec112A8B3ff",
            usdc_paymaster: "0x17D664aa4515947F7fEe864e3666f00b5A65Df57"
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

function sendMainTokenCalls(token_paymaster, receiveAddress, amount) {
    let execTransactionABI = ["function execTransactionFromEntrypointBatch((bool allowFailed, address to, uint256 value, bytes data, bytes nestedCalls)[])"];
    let iExecTransactionABIface = new ethers.utils.Interface(execTransactionABI);

    console.log({ token_paymaster })
    let approveABI = ["function approve(address spender, uint256 amount)"];
    let iapproveABIface = new ethers.utils.Interface(approveABI);
    let approve0 = [token_paymaster, 0];
    let approve1 = [token_paymaster, ethers.BigNumber.from("2").pow(256).sub(1)];

    // 创建参数对象
    let params = [
        {
            allowFailed: false, //  事务不接受失败
            to: "0xC852bf35CB7B54a33844B181e6fD163387D85868",   // 执行事务的合约地址
            value: 0, // 事务传递的以太币数量
            data: iapproveABIface.encodeFunctionData("approve", approve0),         // calldata数据
            nestedCalls: "0x"   // 内嵌的参数信息，可以再前一级的事务执行完成后，接着继续执行
        }
        ,
        {
            allowFailed: false, //  事务不接受失败
            to: "0xC852bf35CB7B54a33844B181e6fD163387D85868",   // 执行事务的合约地址
            value: 0, // 事务传递的以太币数量
            data: iapproveABIface.encodeFunctionData("approve", approve1),         // calldata数据
            nestedCalls: "0x"   // 内嵌的参数信息，可以再前一级的事务执行完成后，接着继续执行
        },
        // // 您可以根据需要添加更多对象
        {
            allowFailed: false, //  事务不接受失败
            to: receiveAddress,   // 执行事务的合约地址
            value: amount, // 事务传递的以太币数量
            data: "0x",         // calldata数据
            nestedCalls: "0x"   // 内嵌的参数信息，可以再前一级的事务执行完成后，接着继续执行
        }
    ];

    return iExecTransactionABIface.encodeFunctionData("execTransactionFromEntrypointBatch", [params]);
}


function getInitCode(factoryAddress, owner, salt) {
    const iface = new ethers.utils.Interface(["function createAccount(address owner, uint salt) "]);
    const initCallData = iface.encodeFunctionData("createAccount", [owner, salt]);
    return factoryAddress + initCallData.slice(2);
}

function computeCreate2Address(factoryAddress, salt, byteCode, accountImplementation, owner) {

    const abi = ["function initialize(address anOwner)"];
    const iface = new ethers.utils.Interface(abi);
    const initializeCallData = ethers.utils.defaultAbiCoder.encode(
        ["address", "bytes"],
        [accountImplementation, iface.encodeFunctionData("initialize", [owner])]
    );
    const creationCode = byteCode + initializeCallData.substring(2); // 移除 '0x'

    // 使用 CREATE2 计算地址
    const create2Address = ethers.utils.getCreate2Address(
        factoryAddress, // 部署合约的地址
        salt,
        ethers.utils.keccak256(creationCode)
    );

    console.log({ create2Address });
    return create2Address;
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
    } else if (hre.network.name === "fuji") {
        config = network_configs.fuji
    } else {
        config = network_configs.ethereum
    }

    console.log("Network:", hre.network.name)

    let [addr, ...addrs] = await ethers.getSigners();
    console.log("address: " + addr.address);


    const entryPointFactory = await ethers.getContractFactory("EntryPoint");
    const entryPoint = await entryPointFactory.attach(config.contract_address.entry_point);

    // const factoryAddress = "0xA02867e1b8410a810Ca3b4875A7A33C89846Ea10";
    const factoryAddress = "0x4C8Fcd41651cb329990c377f1a6d93253098F9b6";
    const owner = "0x383b2aA0fCB6dd340CF01a5B3F32739719d0f77F"


    const salt = ethers.utils.hexZeroPad(ethers.utils.hexlify(56), 32);  // 使用0作为盐值
    console.log({ salt })
    const ERC1967ProxyBytecode = "0x60806040526040516107353803806107358339810160408190526100229161031e565b61002e82826000610035565b505061043b565b61003e8361006b565b60008251118061004b5750805b156100665761006483836100ab60201b6100291760201c565b505b505050565b610074816100d7565b6040516001600160a01b038216907fbc7cd75a20ee27fd9adebab32041f755214dbc6bffa90cc0225b39da2e5c2d3b90600090a250565b60606100d0838360405180606001604052806027815260200161070e602791396101a9565b9392505050565b6100ea8161022260201b6100551760201c565b6101515760405162461bcd60e51b815260206004820152602d60248201527f455243313936373a206e657720696d706c656d656e746174696f6e206973206e60448201526c1bdd08184818dbdb9d1c9858dd609a1b60648201526084015b60405180910390fd5b806101887f360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc60001b61023160201b6100641760201c565b80546001600160a01b0319166001600160a01b039290921691909117905550565b6060600080856001600160a01b0316856040516101c691906103ec565b600060405180830381855af49150503d8060008114610201576040519150601f19603f3d011682016040523d82523d6000602084013e610206565b606091505b50909250905061021886838387610234565b9695505050505050565b6001600160a01b03163b151590565b90565b606083156102a0578251610299576001600160a01b0385163b6102995760405162461bcd60e51b815260206004820152601d60248201527f416464726573733a2063616c6c20746f206e6f6e2d636f6e74726163740000006044820152606401610148565b50816102aa565b6102aa83836102b2565b949350505050565b8151156102c25781518083602001fd5b8060405162461bcd60e51b81526004016101489190610408565b634e487b7160e01b600052604160045260246000fd5b60005b8381101561030d5781810151838201526020016102f5565b838111156100645750506000910152565b6000806040838503121561033157600080fd5b82516001600160a01b038116811461034857600080fd5b60208401519092506001600160401b038082111561036557600080fd5b818501915085601f83011261037957600080fd5b81518181111561038b5761038b6102dc565b604051601f8201601f19908116603f011681019083821181831017156103b3576103b36102dc565b816040528281528860208487010111156103cc57600080fd5b6103dd8360208301602088016102f2565b80955050505050509250929050565b600082516103fe8184602087016102f2565b9190910192915050565b60208152600082518060208401526104278160408501602087016102f2565b601f01601f19169190910160400192915050565b6102c48061044a6000396000f3fe60806040523661001357610011610017565b005b6100115b610027610022610067565b61009f565b565b606061004e8383604051806060016040528060278152602001610268602791396100c3565b9392505050565b6001600160a01b03163b151590565b90565b600061009a7f360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc546001600160a01b031690565b905090565b3660008037600080366000845af43d6000803e8080156100be573d6000f35b3d6000fd5b6060600080856001600160a01b0316856040516100e09190610218565b600060405180830381855af49150503d806000811461011b576040519150601f19603f3d011682016040523d82523d6000602084013e610120565b606091505b50915091506101318683838761013b565b9695505050505050565b606083156101ac5782516101a5576001600160a01b0385163b6101a55760405162461bcd60e51b815260206004820152601d60248201527f416464726573733a2063616c6c20746f206e6f6e2d636f6e747261637400000060448201526064015b60405180910390fd5b50816101b6565b6101b683836101be565b949350505050565b8151156101ce5781518083602001fd5b8060405162461bcd60e51b815260040161019c9190610234565b60005b838110156102035781810151838201526020016101eb565b83811115610212576000848401525b50505050565b6000825161022a8184602087016101e8565b9190910192915050565b60208152600082518060208401526102538160408501602087016101e8565b601f01601f1916919091016040019291505056fe416464726573733a206c6f772d6c6576656c2064656c65676174652063616c6c206661696c6564a2646970667358221220e721089e942bbb84412c4dd55401fe6ec84b9c4e16fd04d47ddf079c58c49b2d64736f6c634300080c0033416464726573733a206c6f772d6c6576656c2064656c65676174652063616c6c206661696c6564"; // ERC1967Proxy的创建字节码
    // const accountImplementation = "0xB92Cb9EDc842D1936598505ad26C977532506Afb";
    const accountImplementation = "0x3941c76BD13764fc79bEE0A55E8d95bfA39EC2dE";


    const abi = ["function initialize(address anOwner)"];
    const iface = new ethers.utils.Interface(abi);
    const initializeCallData = iface.encodeFunctionData("initialize", [owner]);
    console.log({ initializeCallData })

    const encodedConstructorArgs = ethers.utils.defaultAbiCoder.encode(
        ["address", "bytes"],
        [accountImplementation, initializeCallData]
    );
    console.log({ encodedConstructorArgs })
    const predictedAddress = computeCreate2Address(factoryAddress, salt, ERC1967ProxyBytecode, accountImplementation, owner);
    console.log({ predictedAddress });

    const initCode = getInitCode(factoryAddress, owner, salt);
    console.log({ initCode })


    const _nonce = "1";
    // const _nonce = await simpleAccount.nonce();

    // const senderAddress = config.contract_address.simple_account;
    const senderAddress = predictedAddress;
    const nonce = _nonce.toString();
    // const initCode = "0x";
    // const callData = sendMainTokenCall(config.receiver_address, config.send_amount);
    const callData = sendMainTokenCalls(config.contract_address.token_paymaster, config.receiver_address, config.send_amount);
    const callGasLimit = 500000;
    const verificationGasLimit = 500000;
    const preVerificationGas = 500000;
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
    /**
     *  "0xE737Aae2cbaECc8B0Aad0D7268CCc16a205966b9","0","0x","0xb61d27f6000000000000000000000000f5054f94009b7e9999f6459f40d8eab1a2cea22d00000000000000000000000000000000000000000000000000038d7ea4c6800000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000000","210000","210000","210000","2250000024","2250000024","0xeb869abba30c92738748519fade85d49f85655b400000000000000000000000000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000041fe8cad7cd241f8cebd41a286ef5f1611baf1516f10c9224501d1213c508c499f0058d88a6634d9c32d5e5e1b1906beef4d5e78df8c8cd9cbf70e0f44159f82841b00000000000000000000000000000000000000000000000000000000000000","0x773bda426101eb5b377a90849d49faf5fcdcfe3c10e0c84032a59e982e62d0f37f123f5e1b5bc7717a9122e06dcd8d39d9319b82d55e1a5485ab60e4a12414751b"
     */
    const handleOpsRes = await entryPoint.handleOps([params], addr.address, { gasLimit: 5000000 });
    handleOpsRes.wait();
    console.log("handleOpsRes tx hash: " + handleOpsRes.hash);
}

// 使用函数


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});