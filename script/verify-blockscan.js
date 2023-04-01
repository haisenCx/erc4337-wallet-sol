// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");


// Constants
const network_configs = {
    mumbai: {
        entry_point_contract_address: "0x5Ef8bfc9cB80cD5E3db36927D481cCD719C3Ac0A",
        entry_point_arguments: [],
    }, ethereum: {},
}

async function main() {
    // Hardhat always runs the compile task when running scripts with its command
    // line interface.
    //
    // If this script is run directly using `node` you may want to call compile
    // manually to make sure everything is compiled
    // await hre.run('compile');

    // We get the Assets contract to deploy

    let contract_address;
    let constructor_arguments;
    if (hre.network.name === "mumbai") {
        contract_address = network_configs.mumbai.entry_point_contract_address
        constructor_arguments = network_configs.mumbai.entry_point_arguments
        console.log("contract_address: ", contract_address)
        console.log("constructor_arguments: ", constructor_arguments)
        // verify the contracts
        await hre.run("verify:verify", {
            address: contract_address,
            constructorArguments: constructor_arguments,
        });
    } else if (hre.network.name === "ethereum") {
    } else {
    }


}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});