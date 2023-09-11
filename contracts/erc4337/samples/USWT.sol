// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract USWT is ERC20 {

    address private owner;

    modifier onlyOwner() {
        _onlyOwner();
        _;
    }

    function _onlyOwner() internal view {
        require(msg.sender == owner || msg.sender == address(this), "only owner");
    }

    constructor () ERC20("USWT", "USWT") {
        owner = msg.sender;
    }

    function mint(address sender, uint256 amount) external onlyOwner {
        _mint(sender, amount);
    }
}
