// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

/**
* User information contract: record the mapping of user name and index, and save it to the chain
*/
contract UserInfo {

    mapping(string=>string) public userPasswdInfo;

    function addAppConfigRecords(string memory key, string memory value) external {
        string memory _userPasswdInfo = userPasswdInfo[key];
        require(keccak256(abi.encode(_userPasswdInfo)) == keccak256(abi.encode("")), "data is not empty");
        userPasswdInfo[key] = value;
    }

}
