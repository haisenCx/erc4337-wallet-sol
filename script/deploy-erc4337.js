// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const {ethers} = require("hardhat");
const hre = require("hardhat");

const network_configs = {
    mumbai: {
        _eth_usd_aggregator: "0x0715A7794a1dc8e42615F059dD6e406A6594651A",
        _usdc_usd_aggregator: "0x572dDec9087154dC5dfBB1546Bb62713147e0Ab0",
        _usdc_address: "0x9999f7Fea5938fD3b1E26A12c3f2fb024e194f97"
    }, ethereum: {}, polygon: {},
    fuji: {
        _eth_usd_aggregator: "0x86d67c3D38D2bCeE722E601025C25a575021c6EA",
        _usdc_usd_aggregator: "0x7898AcCC83587C3C55116c5230C17a6Cd9C71bad",
        _usdc_address: "0x5425890298aed601595a70AB815c96711a31Bc65"
    }
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
    } else if (hre.network.name === "fuji") {
        config = network_configs.fuji
    } else {
        config = network_configs.ethereum
    }

    console.log("Network:", hre.network.name)

    let [addr] = await ethers.getSigners();

    console.log("Deploy contract EOA address: " + addr.address);

    console.log("[EntryPoint] Start to deploy");
    const entryPointFactory = await ethers.getContractFactory("EntryPoint");
    const entryPoint = await entryPointFactory.deploy()
    await entryPoint.deployed();
    console.log("[EntryPoint] Address: " + entryPoint.address);
    console.log("[EntryPoint] ConstructorArguments: " + []);
    await verifyOnBlockscan(entryPoint.address, [], null)

    console.log("[SmarterAccountV1Factory] Start to deploy");
    const smarterAccountV1FFactory = await ethers.getContractFactory("SmarterAccountV1Factory");
    const smarterAccountV1F = await smarterAccountV1FFactory.deploy(entryPoint.address);
    await smarterAccountV1F.deployed();
    console.log("[SmarterAccountV1Factory] Contract address: " + smarterAccountV1F.address);
    console.log("[SmarterAccountV1Factory] ConstructorArguments: " + [entryPoint.address]);
    await verifyOnBlockscan(smarterAccountV1F.address, [entryPoint.address], "contracts/erc4337/samples/SmarterAccountV1Factory.sol:SmarterAccountV1Factory")

    console.log("[USDCTokenPaymaster] Start to deploy");
    const tokenPaymasterFactory = await ethers.getContractFactory("USDCTokenPaymaster");
    const tokenPaymaster = await tokenPaymasterFactory.deploy(smarterAccountV1F.address, entryPoint.address, config._eth_usd_aggregator, config._usdc_usd_aggregator, config._usdc_address);
    await tokenPaymaster.deployed();
    console.log("[USDCTokenPaymaster] Contract address: " + tokenPaymaster.address);
    console.log("[USDCTokenPaymaster] ConstructorArguments: " + [smarterAccountV1F.address, entryPoint.address, config._eth_usd_aggregator, config._usdc_usd_aggregator, config._usdc_address]);
    await verifyOnBlockscan(tokenPaymaster.address, [smarterAccountV1F.address, entryPoint.address, config._eth_usd_aggregator, config._usdc_usd_aggregator, config._usdc_address], null)

    console.log("[Success] All contracts have been deployed success.")
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