// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const {ethers} = require("hardhat");
const hre = require("hardhat");

const network_configs = {
    mumbai: {}, ethereum: {}, polygon: {},
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

    let [addr] = await ethers.getSigners();

    console.log("Deploy contract EOA address: " + addr.address);

    const entryPointFactory = await ethers.getContractFactory("EntryPoint");
    const entryPoint = await entryPointFactory.deploy()
    await entryPoint.deployed();
    console.log("[EntryPoint] address: " + entryPoint.address);
    console.log("[EntryPoint] ConstructorArguments: " + []);
    await verifyOnBlockscan(entryPoint.address, [], null)

    const simpleAccountFFactory = await ethers.getContractFactory("SimpleAccountFactory");
    const simpleAccountF = await simpleAccountFFactory.deploy(entryPoint.address);
    await simpleAccountF.deployed();
    console.log("[SimpleAccountFactory] contract address: " + simpleAccountF.address);
    console.log("[SimpleAccountFactory] ConstructorArguments: " + [entryPoint.address]);
    await verifyOnBlockscan(simpleAccountF.address, [entryPoint.address], "contracts/erc4337/samples/SimpleAccountFactory.sol:SimpleAccountFactory")

    // const simpleAccountFactory = await ethers.getContractFactory("SimpleAccount");
    // const simpleAccount = await simpleAccountFactory.deploy(entryPoint.address);
    // await simpleAccount.deployed();
    // console.log("[SimpleAccount] contract address: " + simpleAccount.address);
    // console.log("[SimpleAccount] ConstructorArguments: " + [entryPoint.address]);
    // await verifyOnBlockscan(simpleAccount.address, [entryPoint.address], null)

    // set wallet account owner
    // await simpleAccount.initialize(addr.address);

    const tokenPaymasterFactory = await ethers.getContractFactory("SWTokenPaymaster");
    const tokenPaymaster = await tokenPaymasterFactory.deploy(simpleAccountF.address, "SWT", entryPoint.address);
    await tokenPaymaster.deployed();
    console.log("[TokenPaymaster] contract address: " + tokenPaymaster.address);
    console.log("[TokenPaymaster] ConstructorArguments: " + [simpleAccountF.address, "SWT", entryPoint.address]);
    await verifyOnBlockscan(tokenPaymaster.address, [simpleAccountF.address, "SWT", entryPoint.address], null)

}

async function verifyOnBlockscan(address, args, contractPath) {
    let success = false;
    while (!success) {
        try {
            let params = {
                address: address,
                constructorArguments: args,
            };
            if (contractPath != null){
                params["contract"] = contractPath;
            }
            await hre.run("verify:verify", params);
            console.log("Script executed successfully");
            success = true;
        } catch (error) {
            console.log(`Script failed: ${error}`);
            console.log(`Trying again in 3 seconds...`);
            await new Promise((resolve) => setTimeout(resolve, 3000));
        }
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});