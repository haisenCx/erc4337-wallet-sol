// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

// [EntryPoint] address: 0x9441180e0C561c252b3bF7c2048864b7F0A662A6
// [EntryPoint] ConstructorArguments:
// [SimpleAccountFactory] contract address: 0xD640F8f864a212CfDd8FE8B9Fdfb69d24f09b65e
// [SimpleAccountFactory] ConstructorArguments: 0x9441180e0C561c252b3bF7c2048864b7F0A662A6
// [SimpleAccount] contract address: 0x884fBD8043BedC0c700577cbB7632D09dB8E35Fd
// [SimpleAccount] ConstructorArguments: 0x9441180e0C561c252b3bF7c2048864b7F0A662A6
// [TokenPaymaster] contract address: 0xa4baa71e173Ef63250fB1D9a1FE1467f722B19C7
// [TokenPaymaster] ConstructorArguments: 0xD640F8f864a212CfDd8FE8B9Fdfb69d24f09b65e,USDTPM,0x9441180e0C561c252b3bF7c2048864b7F0A662A6

// Constants
const network_configs = {
    mumbai: {
        deploy: [
            {
                name: "EntryPoint",
                address: "0x9441180e0C561c252b3bF7c2048864b7F0A662A6",
                arguments: [],
            },
            {
                name: "SimpleAccountFactory",
                address: "0xD640F8f864a212CfDd8FE8B9Fdfb69d24f09b65e",
                arguments: ["0x9441180e0C561c252b3bF7c2048864b7F0A662A6"],
                path: "contracts/erc4337/samples/SimpleAccountFactory.sol:SimpleAccountFactory"
            },
            {
                name: "SimpleAccount",
                address: "0x884fBD8043BedC0c700577cbB7632D09dB8E35Fd",
                arguments: ["0x9441180e0C561c252b3bF7c2048864b7F0A662A6"],
            },
            {
                name: "TokenPaymaster",
                address: "0xa4baa71e173Ef63250fB1D9a1FE1467f722B19C7",
                arguments: ["0xD640F8f864a212CfDd8FE8B9Fdfb69d24f09b65e", "USDTPM", "0x9441180e0C561c252b3bF7c2048864b7F0A662A6"],
            }
        ],
    }, ethereum: {},
}

async function main() {
    if (hre.network.name === "mumbai") {
        const deploys = network_configs.mumbai.deploy;
        for (const contract of deploys) {
            console.log("Start verify on block scan...");
            console.log("Contract name: " + contract.name);
            console.log("Contract path: " + contract.path);
            console.log("Contract address: " + contract.address);
            console.log("Contract arguments: " + contract.arguments);
            try {
                await hre.run("verify:verify", {
                    address: contract.address,
                    constructorArguments: contract.arguments,
                    contract: contract.path
                });
            } catch (error) {
                console.error(error);
            }
        }
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