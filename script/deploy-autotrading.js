// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const {ethers} = require("hardhat");
const hre = require("hardhat");

const network_configs = {
    mumbai: {
        struct_params: ["0xE592427A0AEce92De3Edee1F18E0157C05861564", "0x1F98431c8aD98523631AE4a59f267346ea31F984"]
    }, polygon: {
        struct_params: ["0xE592427A0AEce92De3Edee1F18E0157C05861564", "0x1F98431c8aD98523631AE4a59f267346ea31F984"]
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

    let [addr] = await ethers.getSigners();

    console.log("Your address: " + addr.address);
    const userInfoFactory = await ethers.getContractFactory("AutoTrading");
    const params = config.struct_params;
    const autoTrading = await userInfoFactory.deploy(params[0], params[1]);
    await autoTrading.deployed();
    console.log("AutoTrading contract address: " + autoTrading.address);

    await verifyOnBlockscan(autoTrading.address, params, "contracts/aawallet/AutoTrading.sol:AutoTrading")
}

async function verifyOnBlockscan(address, args, contractPath) {
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


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});