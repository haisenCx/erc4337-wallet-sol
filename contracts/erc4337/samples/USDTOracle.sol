// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

import "../samples/IOracle.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract USDTOracle is IOracle {

    using SafeMath for uint256;

    address private owner;

    // 0xd0D5e3DB44DE05E9F294BB0a3bEEaF030DE24Ada
    address private matic2usd;
    // 0x92C09849638959196E976289418e5973CC96d645
    address private usdt2usd;

    modifier onlyOwner {
        require(msg.sender == owner, 'only owner');
        _;
    }

    constructor(){
        owner = msg.sender;
    }

    function setMatic2Usd(address _address) external onlyOwner {
        matic2usd = _address;
    }

    function setUsdt2Usd(address _address) external onlyOwner {
        usdt2usd = _address;
    }

    function getTokenValueOfEth(uint256 ethOutput) external view override returns (uint256 tokenInput) {
        // 100029000
        // decimal=8
//        uint256 usdt2usdPrice = getLatestPrice(usdt2usd)*1e8;
//        uint256 matic2usdPrice = getLatestPrice(matic2usd);
//
//        (bool success, uint256 r) = usdt2usdPrice.tryDiv(matic2usdPrice);
//        require(success, 'div error');
//
//        return r * ethOutput / 1e8;
        // TODO for test
        return ethOutput / 100;
    }

    function getLatestPrice(address _address) public view returns (uint256) {
        (
        uint80 roundID,
        int price,
        uint startedAt,
        uint timeStamp,
        uint80 answeredInRound
        ) = AggregatorV3Interface(_address).latestRoundData();
        return uint256(price);
    }

}
