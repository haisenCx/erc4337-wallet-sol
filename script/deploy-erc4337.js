// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { ethers } = require("hardhat");
const hre = require("hardhat");
const utils = require("./utils");

const network_configs = {
    mumbai: {
        _eth_usd_aggregator: "0xd0D5e3DB44DE05E9F294BB0a3bEEaF030DE24Ada",
        _usdc_usd_aggregator: "0x572dDec9087154dC5dfBB1546Bb62713147e0Ab0",
        _usdc_address: "0x9999f7Fea5938fD3b1E26A12c3f2fb024e194f97"
    }, ethereum: {}, polygon: {},
    fuji: {
        _eth_usd_aggregator: "0x5498BB86BC934c8D34FDA08E81D444153d0D06aD",
        _usdc_usd_aggregator: "0x7898AcCC83587C3C55116c5230C17a6Cd9C71bad",
        _usdc_address: "0x5425890298aed601595a70AB815c96711a31Bc65"
    },
    moonbeam: {
        // don't support USDCTokenPayMaster
        _eth_usd_aggregator: "0x5498BB86BC934c8D34FDA08E81D444153d0D06aD",
        _usdc_usd_aggregator: "0x7898AcCC83587C3C55116c5230C17a6Cd9C71bad",
        _usdc_address: "0x5425890298aed601595a70AB815c96711a31Bc65"
    }
}

async function main() {
    const network = hre.network.name;
    console.log("Network:", network, "configs:", network_configs[network]);

    let config = network_configs[network];

    let [addr] = await ethers.getSigners();

    console.log("Deploy contract EOA address: " + addr.address);

    const entryPointAddress = await delopyContract("EntryPoint", "EntryPoint", [], null);

    const accountFactory = await delopyContract("SmarterAccountV1Factory", "SmarterAccountV1Factory",
        [entryPointAddress], "contracts/samples/SmarterAccountV1Factory.sol:SmarterAccountV1Factory");

    const SWTTokenPaymasterAddress = await delopyContract("SWTTokenPaymaster", "SWTokenPaymaster",
        [accountFactory, "SWT", entryPointAddress], null);

    const USDCTokenPaymasterAddress = await delopyContract("USDCTokenPaymaster", "USDCTokenPaymaster",
        [accountFactory, entryPointAddress, config._eth_usd_aggregator, config._usdc_usd_aggregator, config._usdc_address], null);

    console.log("------------ RESULT ---------------")
    console.log("[ContractAddress] EntryPointAddress: %s", entryPointAddress);
    console.log("[ContractAddress] SmarterAccountV1FactoryAddress: %s", accountFactory);
    console.log("[ContractAddress] SWTTokenPaymasterAddress: %s", SWTTokenPaymasterAddress);
    console.log("[ContractAddress] USDCTokenPaymasterAddress: %s", USDCTokenPaymasterAddress);
    console.log("------------ RESULT ---------------")

    console.log("[Success] All contracts have been deployed success.")
}

async function delopyContract(name, contractName, constructorParams = [], verifyParams) {
    console.log("[%s] Start to deploy", name);
    console.log("[%s] ConstructorArguments: %s", name, constructorParams);
    const factory = await ethers.getContractFactory(contractName);
    const contract = await factory.deploy(...constructorParams);
    await contract.deployed();
    await utils.verifyOnBlockscan(contract.address, constructorParams, verifyParams);
    console.log("[%s] Contract address: %s", name, contract.address);
    return contract.address;
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});