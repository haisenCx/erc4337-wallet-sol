// const { describe, beforeEach, it } = require('mocha');
const {expect} = require("chai");
const {ethers, network} = require("hardhat");
const {arrayify} = require("@ethersproject/bytes");

const ETH = (value) => ethers.utils.parseEther(value);

function Log(msg) {
    console.log("\t" + msg);
}

function parseHexString(str) {
    var result = [];
    while (str.length >= 2) {
        result.push(parseInt(str.substring(0, 2), 16));
        str = str.substring(2, str.length);
    }
    return result;
}

// eslint-disable-next-line no-undef
describe("genofusion-asset", function () {
    let admin, maintainer, minter, signer, addr1, addr2, addrs;

    let entryPointFactory, entryPoint;
    let simpleAccountFactory, simpleAccount;

    // `beforeEach` will run before each test, re-deploying the contract every
    // time. It receives a callback, which can be async.
    // eslint-disable-next-line no-undef
    beforeEach(async function () {
        [admin, maintainer, signer, minter, addr1, addr2, ...addrs] = await ethers.getSigners();

        entryPointFactory = await ethers.getContractFactory("EntryPoint");
        entryPoint = await entryPointFactory.deploy();
        await entryPoint.deployed();
        Log("entryPoint contract address: " + entryPoint.address);

        simpleAccountFactory = await ethers.getContractFactory("SimpleAccount");
        simpleAccount = await simpleAccountFactory.deploy(entryPoint.address);
        await simpleAccount.deployed();
        Log("simpleAccount contract address: " + simpleAccount.address);


        // set wallet owner
        let tx = await simpleAccount.initialize(addr1.address);
        tx.wait();
        // deposit
        tx = await entryPoint.depositTo(simpleAccount.address, {value: ETH("100")});
        tx.wait();
    });

    // eslint-disable-next-line no-undef
    describe("Deployment", function () {

        /**
         * address sender;
         * uint256 nonce;
         * bytes initCode;
         * bytes callData;
         * uint256 callGasLimit;
         * uint256 verificationGasLimit;
         * uint256 preVerificationGas;
         * uint256 maxFeePerGas;
         * uint256 maxPriorityFeePerGas;
         * bytes paymasterAndData;
         * bytes signature;
         **/
        // eslint-disable-next-line no-undef
        it("Should set the right admin / maintainer / minter", async function () {

            // paymaster sign
            let paymasterAccount = addr1;

            let paymasterAddressBytes = parseHexString(paymasterAccount.address.substring(2));
            let callData = ethers.utils.keccak256("0xb61d27f6000000000000000000000000ff171ddfb3236940297808345f7e32c4b5bf097f000000000000000000000000000000000000000000000000000000000098968000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000000");
            Log("callData: " + callData);

            let paymasterOpHexStr = ethers.utils.defaultAbiCoder.encode(
                ["address", "uint256", "bytes", "bytes", "uint256", "uint256", "uint256", "uint256", "uint256", "bytes", "bytes"],
                [simpleAccount.address, 0, "0x", callData,
                    2100000, 2100000, 2100000, 60000000000, 60000000000, "0x", "0x"]);
            paymasterOpHexStr = paymasterOpHexStr.substring(0, paymasterOpHexStr.length - 64);
            let hash = ethers.utils.keccak256(paymasterOpHexStr);


            const {chainId} = await ethers.provider.getNetwork();
            const packData = ethers.utils.defaultAbiCoder.encode(["bytes32", "address", "uint256"],
                [hash, entryPoint.address, chainId]);
            console.log("packData:", packData);
            let getUserOpHash = ethers.utils.keccak256(packData);
            let signature3 = await addr1.signMessage(arrayify(getUserOpHash));
            console.log("signature3:", signature3);

            // paymasterDataBytes = parseHexString(paymasterDataHex.substring(2));
            let params = [simpleAccount.address.toLowerCase(), 0, "0x", callData,
                2100000, 2100000, 2100000, 60000000000, 60000000000, "0x", signature3];

            Log("Result: " + params.toString())

            Log("addr1 address:" + addr1.address);

            const handleOpsRes = await entryPoint.handleOps([params], addr1.address);
            console.log("handleOpsRes tx:", handleOpsRes.hash);
        });
    });

});