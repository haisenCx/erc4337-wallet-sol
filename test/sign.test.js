// const { describe, beforeEach, it } = require('mocha');
const {expect} = require("chai");
const {ethers} = require("hardhat");
const {arrayify} = require("@ethersproject/bytes");

function Log(msg) {
    console.log("\t" + msg);
}

// eslint-disable-next-line no-undef
describe("sign-test", function () {
    let admin, maintainer, minter, signer, addr1, addr2, addrs;

    let testSignFactory, testSign;
    let simpleAccountFactory, simpleAccount;

    // `beforeEach` will run before each test, re-deploying the contract every
    // time. It receives a callback, which can be async.
    // eslint-disable-next-line no-undef
    beforeEach(async function () {
        [admin, maintainer, signer, minter, addr1, addr2, ...addrs] = await ethers.getSigners();

        testSignFactory = await ethers.getContractFactory("TestSign");
        testSign = await testSignFactory.deploy();
        await testSign.deployed();
        Log("testSign contract address: " + testSign.address);
    });

    // eslint-disable-next-line no-undef
    describe("Deployment", function () {

        it("sign", async function () {
            const [account] = await ethers.getSigners();
            // keccak256()
            const k = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test1"));
            // abi.encode()
            const d = ethers.utils.defaultAbiCoder.encode(["uint256[]"], [[0, 1, 2, 3, 4, 5]]);
            // sign message
            const sign = await account.signMessage("test");
        });

        // eslint-disable-next-line no-undef
        it("test sign", async function () {

            let params = [ethers.utils.keccak256(ethers.utils.toUtf8Bytes("bytes")), addr2.address, 1]
            let pack = ethers.utils.defaultAbiCoder.encode(["bytes", "address", "uint256"], params);
            Log("pack:" + pack);
            let packHash = ethers.utils.keccak256(pack);

            let signature = await addr1.signMessage(arrayify(packHash));
            Log("signature:" + signature);

            Log("Result: " + params.toString())
            Log("addr1 address:" + addr1.address);

            const verifyRes = await testSign.verify(addr1.address, signature, params[0], params[1], params[2]);
            Log("verifyRes:" + verifyRes);
            expect(verifyRes).to.equal(0);
        });
    });

});