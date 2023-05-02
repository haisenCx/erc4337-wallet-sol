// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

contract UserInfo {

    mapping(string => string) public namePasswdHash;

    mapping(string => address) public nameWalletAddress;

    function addAppConfigRecords(string memory username, string memory passwdHash, address walletAddress) external {
        string memory _userNamePasswdHash = namePasswdHash[username];
        require(keccak256(abi.encode(_userNamePasswdHash)) == keccak256(abi.encode("")), "namePasswdHash is not empty");
        string memory _nameWalletAddress = nameWalletAddress[username];
        require(keccak256(abi.encode(_nameWalletAddress)) == keccak256(abi.encode("")), "nameWalletAddress is not empty");
        namePasswdHash[username] = passwdHash;
        nameWalletAddress[username] = walletAddress;
    }

}
