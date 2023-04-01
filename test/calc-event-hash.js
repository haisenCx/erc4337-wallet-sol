// const { describe, beforeEach, it } = require('mocha');
const {expect} = require("chai");
const {ethers} = require("hardhat");

const ETH = (value) => ethers.utils.parseEther(value);

// eslint-disable-next-line no-undef
describe("hash", function () {
    let admin, maintainer, minter, signer, addr1, addr2, addrs;

    // `beforeEach` will run before each test, re-deploying the contract every
    // time. It receives a callback, which can be async.
    // eslint-disable-next-line no-undef
    beforeEach(async function () {
        [admin, maintainer, signer, minter, addr1, addr2, ...addrs] = await ethers.getSigners();
    });

    // eslint-disable-next-line no-undef
    describe("event", function () {

        it("transfer event", async function () {
            const transferHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Transfer(address,address,uint256)"));
            expect(transferHash).to.eq("0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef");
        });

        it("event", async function () {
            const h1 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(
                "UserOperationEvent(bytes32,address,address,uint256,bool,uint256,uint256)"));
            // 0x49628fd1471006c1482da88028e9ce4dbb080b815c9b0344d39e5a8e6ec1419f
            console.log("UserOperationEvent:", h1);
        });
    });

});