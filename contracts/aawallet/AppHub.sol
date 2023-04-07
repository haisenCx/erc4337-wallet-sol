// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

/**
* Record:
* - the third-party application number,
* - the contract address of the third-party application,
* - the function name supported by the third-party application,
* - whether login is required
*/
contract AppHub {

    struct AppConfig {
        address owner;
        address appAddress;
        // split by |
        string funNameAndParams;
        bool needLogin;
    }

    uint256 public appConfigRecordsCount;
    mapping(uint256=>AppConfig) public appConfigRecords;

    function addAppConfigRecords(address appAddress, string memory funNameAndParams, bool needLogin) external returns(uint256) {
        require(appAddress != address(0), "app address can not be 0");
        AppConfig memory _appConfig = AppConfig(msg.sender, appAddress, funNameAndParams, needLogin);
        appConfigRecords[appConfigRecordsCount] = _appConfig;
        return appConfigRecordsCount++;
    }

    function setAppConfigRecords(uint256 appid, address appAddress, string memory funNameAndParams, bool needLogin) external {
        AppConfig storage _appconfig = appConfigRecords[appid];
        require(_appconfig.owner == msg.sender, "app owner error");
        require(appAddress != address(0), "app address can not be 0");
        _appconfig.appAddress = appAddress;
        _appconfig.funNameAndParams = funNameAndParams;
        _appconfig.needLogin = needLogin;
    }

    function removeAppConfigRecords(uint256 appid) external {
        AppConfig storage _appconfig = appConfigRecords[appid];
        require(_appconfig.owner == msg.sender, "app owner error");
        delete appConfigRecords[appid];
    }

}
