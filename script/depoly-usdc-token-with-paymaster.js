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

    console.log("[USDCSimpleAccountFactory] start to deploy");
    const entryPoint_address = "0x081d5B6e93B686cEA78B87f5f96Ec274cC6FFe41";


    const usdcSimpleAccountFFactory = await ethers.getContractFactory("USDCSimpleAccountFactory");
    const usdcSimpleAccountF = await usdcSimpleAccountFFactory.deploy(entryPoint_address);
    await usdcSimpleAccountF.deployed();
    console.log("[USDCSimpleAccountFactory] contract address: " + usdcSimpleAccountF.address);
    console.log("[USDCSimpleAccountFactory] ConstructorArguments: " + [entryPoint_address]);
    await verifyOnBlockscan(usdcSimpleAccountF.address, [entryPoint_address], "contracts/erc4337/usdc/USDCSimpleAccountFactory.sol:USDCSimpleAccountFactory")
//,"0x914d61A743ef074Cb7F843eC468598583D77F6a1"

    /**
     * - EntryPoint: `0x081d5B6e93B686cEA78B87f5f96Ec274cC6FFe41`
     * - SimpleAccountFactory: `0xA02867e1b8410a810Ca3b4875A7A33C89846Ea10`
     *
     * IEntryPoint _entryPoint,
     *         address _eth_usd_aggregator, address _usdt_usd_aggregator, address _usdt_address
     *
     *             0x0715A7794a1dc8e42615F059dD6e406A6594651A Mumbai | Eth->USD
     *     0xd0D5e3DB44DE05E9F294BB0a3bEEaF030DE24Ada Mumbai | Matic->USD
     *      0x572dDec9087154dC5dfBB1546Bb62713147e0Ab0 Mumbai | USDC->USD
     */

    console.log("[USDCTokenPaymaster] start to deploy");
    const usdcTokenPaymasterFactory = await ethers.getContractFactory("USDCTokenPaymaster");
    const args = [usdcSimpleAccountF.address, entryPoint_address, "0x0715A7794a1dc8e42615F059dD6e406A6594651A", "0x572dDec9087154dC5dfBB1546Bb62713147e0Ab0", "0xC852bf35CB7B54a33844B181e6fD163387D85868"]

    const usdcTokenPaymaster = await usdcTokenPaymasterFactory.deploy(usdcSimpleAccountF.address, entryPoint_address,
        "0x0715A7794a1dc8e42615F059dD6e406A6594651A", "0x572dDec9087154dC5dfBB1546Bb62713147e0Ab0", "0xC852bf35CB7B54a33844B181e6fD163387D85868");
    await usdcTokenPaymaster.deployed();
    console.log("[USDCTokenPaymaster] contract address: " + usdcTokenPaymaster.address);
     console.log("[USDCTokenPaymaster] ConstructorArguments: " + args);
    await verifyOnBlockscan(usdcTokenPaymaster.address, args, null)

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