// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "hardhat/console.sol";

contract TestSign {
    using ECDSA for bytes32;

    function verify(address signer, bytes memory signature, bytes memory data1, address data2, uint256 data3)
    external view returns
    (uint256 sigTimeRange) {
        bytes32 hash = keccak256(abi.encode(data1, address(data2), data3));
        bytes32 hashForEth = hash.toEthSignedMessageHash();

        if (signer != hashForEth.recover(signature))
            return 1;
        return 0;
    }

}
