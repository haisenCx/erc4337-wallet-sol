// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const {ethers} = require("hardhat");
const hre = require("hardhat");

const network_configs = {
    mumbai: {
    }, ethereum: {
    },
}

let config;

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
    const entryPoint = await entryPointFactory.deploy()
    await entryPoint.deployed();
    console.log("EntryPoint contract address: " + entryPoint.address);

    const simpleAccountFFactory = await ethers.getContractFactory("SimpleAccountFactory");
    const simpleAccountF = await simpleAccountFFactory.deploy(entryPoint.address);
    await simpleAccountF.deployed();
    console.log("simpleAccount Factory contract address: " + simpleAccountF.address);

    const simpleAccountFactory = await ethers.getContractFactory("SimpleAccount");
    const simpleAccount = await simpleAccountFactory.deploy(entryPoint.address);
    await simpleAccount.deployed();
    console.log("simpleAccount contract address: " + simpleAccount.address);
    // set wallet account owner
    await simpleAccount.initialize(addr.address);

    const tokenPaymasterFactory = await ethers.getContractFactory("TokenPaymaster");
    const tokenPaymaster = await tokenPaymasterFactory.deploy(
        simpleAccountF.address, "USDTPM", entryPoint.address);
    await tokenPaymaster.deployed();
    console.log("tokenPaymaster contract address: " + tokenPaymaster.address);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});