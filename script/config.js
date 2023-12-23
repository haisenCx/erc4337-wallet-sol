module.exports = {
    mumbai: {
        contractAddress: {
            entryPoint: "0xD79b0817A1Aeb55042d7b10bD25f99F17239333a",
            smarterV1Factory: "0x57811fb5ea260740244fc81f421a5Ca156c78060",
            usdcPaymaster: "0x0F1499cBB313492a164e93f2c5a35a35246d030E",
            swtPaymaster: "0x4B63443E5eeecE233AADEC1359254c5C601fB7f4",
            usdc: "0x9999f7Fea5938fD3b1E26A12c3f2fb024e194f97",
            uswt: "0xF981Ac497A0fe7ad2Dd670185c6e7D511Bf36d6d",
            swt: "",
        },
        txConfig: {
            gasfeeToken: "usdc",
            gasLimit: 500000,
        }
    },
    moonbase: {
        contractAddress: {
            entryPoint: "0xA02867e1b8410a810Ca3b4875A7A33C89846Ea10",
            smarterV1Factory: "0x4B63443E5eeecE233AADEC1359254c5C601fB7f4",
            usdcPaymaster: "",
            swtPaymaster: "0xc3E0A55109c032328F67202c020f7Da2Fddd8B8a",
            usdc: "",
            uswt: "",
            swt: "0xc3E0A55109c032328F67202c020f7Da2Fddd8B8a",
        },
        txConfig: {
            gasfeeToken: "swt",
            gasLimit: 500000,
        }
    },
    // Add other network configurations as needed
};
