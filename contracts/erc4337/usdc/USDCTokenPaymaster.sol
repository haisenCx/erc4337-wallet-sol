// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

/* solhint-disable reason-string */

import "contracts/erc4337/samples/TokenPaymaster.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./USDCSimpleAccount.sol";
import "@openzeppelin/contracts/utils/Address.sol";

/**
 * A sample paymaster that define itself as a token to pay for gas.
 * The paymaster IS the token to use, since a paymaster cannot use an external contract.
 * Also, the exchange rate has to be fixed, since it can't reference an external Uniswap or other exchange contract.
 * subclass should override "getTokenValueOfEth to provide actual token exchange rate, settable by the owner.
 * Known Limitation: this paymaster is exploitable when put into a batch with multiple ops (of different accounts):
 * - while a single op can't exploit the paymaster (if postOp fails to withdraw the tokens, the user's op is reverted,
 *   and then we know we can withdraw the tokens), multiple ops with different senders (all using this paymaster)
 *   in a batch can withdraw funds from 2nd and further ops, forcing the paymaster itself to pay (from its deposit)
 * - Possible workarounds are either use a more complex paymaster scheme (e.g. the DepositPaymaster) or
 *   to whitelist the account and the called method ids.
 */
contract USDCTokenPaymaster is BasePaymaster {
    // Type Declarations
    using SafeMath for uint256;
    using Address for address;
    /**

    /**
    0x0715A7794a1dc8e42615F059dD6e406A6594651A Mumbai | Eth->USD
    0xd0D5e3DB44DE05E9F294BB0a3bEEaF030DE24Ada Mumbai | Matic->USD
    0xAB594600376Ec9fD91F8e885dADF0CE036862dE0 Polygon mainnet | Matic->USD
    0xc2132D05D31c914a87C6611C10748AEb04B58e8F Polygon mainnet | USDT token

    0xe6b8a5CF854791412c1f6EFC7CAf629f5Df1c747

    **/

    // the feed price aggregator for eth to usd
    AggregatorV3Interface private eth_usd_aggregator;
    // the feed price aggregator for usdc to usd
    AggregatorV3Interface private usdc_usd_aggregator;

    //usdc erc20 token address
    ERC20 private immutable _usdc;
    //calculated cost of the postOp
    uint256 constant public COST_OF_POST = 15000;

    //main for validate init_code if it's current AA wallet address
    address public immutable theFactory;

    event price_event( uint indexed price);



    constructor(address accountFactory, IEntryPoint _entryPoint,
        address _eth_usd_aggregator, address _usdc_usd_aggregator, address _usdc_address) BasePaymaster(_entryPoint) {
        eth_usd_aggregator = AggregatorV3Interface(_eth_usd_aggregator);
        usdc_usd_aggregator = AggregatorV3Interface(_usdc_usd_aggregator);
        _usdc = ERC20(_usdc_address);
        theFactory = accountFactory;
    }
    //the decimals of valueToken is 18
    function getTokenValueOfEth(uint256 valueEth) internal view returns (uint256 valueToken) {
        //get the price for eth to usd
        (, int256 ethAnswer,,,) = eth_usd_aggregator.latestRoundData();
        // get 1 wei price,and keep equal 18 decimals
        uint256 ethPrice = uint(ethAnswer).mul(1e10);
        // get the final price for current token amount
        (bool success1, uint256 r1) = ethPrice.tryMul(valueEth);
        require(success1, "SafeMath: multiplication overflow");
        // get current usdc price
        (, int256 usdcAnswer,,,) = usdc_usd_aggregator.latestRoundData();
        (bool success2, uint256 result) = r1.tryDiv(uint(usdcAnswer));
        require(success2, "SafeMath: division overflow");
        //compute usdc amount according to usd amount,the decimals of usdc is 6
        valueToken = result.div(1e22);
    }

/**
  * validate the request:
  * if this is a constructor call, make sure it is a known account (that is, a contract that
  * we trust that in its constructor will set
  * verify the sender has enough tokens.
  * (since the paymaster is also the token, there is no notion of "approval")
  */
    function validatePaymasterUserOp(UserOperation calldata userOp, bytes32 /*userOpHash*/, uint256 requiredPreFund)
    external view override returns (bytes memory context, uint256 sigTimeRange) {
        uint256 tokenPrefund = getTokenValueOfEth(requiredPreFund);
// verificationGasLimit is dual-purposed, as gas limit for postOp. make sure it is high enough
// make sure that verificationGasLimit is high enough to handle postOp
        require(userOp.verificationGasLimit > COST_OF_POST, "USDTTokenPaymaster: gas too low for postOp");
        if (userOp.initCode.length != 0) {
            _validateConstructor(userOp);
//the decimals of usdc is 6,so we need to transfer tokenPrefund decimals to 18 ,then compare usdc balance of sender
            require(_usdc.balanceOf(userOp.sender) >= tokenPrefund, "USDTTokenPaymaster: no balance (pre-create)");
        } else {
            require(_usdc.balanceOf(userOp.sender) >= tokenPrefund, "USDTTokenPaymaster: no balance");
        }

        return (abi.encode(userOp.sender), 0);
    }

/**
 * transfer paymaster ownership.
 * owner of this paymaster is allowed to withdraw funds (tokens transferred to this paymaster's balance)
 * when changing owner, the old owner's withdrawal rights are revoked.
 */
    function transferOwnership(address newOwner) public override virtual onlyOwner {
        super.transferOwnership(newOwner);
    }

/**
* actual charge of user.
* this method will be called just after the user's TX with mode==OpSucceeded|OpReverted (account pays in both cases)
* BUT: if the user changed its balance in a way that will cause  postOp to revert, then it gets called again, after reverting
* the user's TX , back to the state it was before the transaction started (before the validatePaymasterUserOp),
* and the transaction should succeed there.
*/
    function _postOp(PostOpMode mode, bytes calldata context, uint256 actualGasCost) internal override {
        //we don't really care about the mode, we just pay the gas with the user's tokens.
        (mode);
        address payable sender = abi.decode(context, (address));
        emit price_event(actualGasCost + COST_OF_POST);
        uint256 charge = getTokenValueOfEth(actualGasCost + COST_OF_POST);
        emit price_event(charge);
        USDCSimpleAccount(sender).transfer(address(_usdc), address(this), charge);
    }

// when constructing an account, validate constructor code and parameters
// we trust our factory (and that it doesn't have any other public methods)
    function _validateConstructor(UserOperation calldata userOp) internal virtual view {
        address factory = address(bytes20(userOp.initCode[0 : 20]));
        require(factory == theFactory, "USDCTokenPaymaster: wrong account factory");
    }

    function getEthUsdAggregatorAddress() public view returns (address){
        return address(eth_usd_aggregator);
    }

    function getUsdcUsdAggregatorAddress() public view returns (address){
        return address(usdc_usd_aggregator);
    }

    function updateEthUsdAggregatorAddress(address _eth_usd_aggregator) public onlyOwner() {
        eth_usd_aggregator = AggregatorV3Interface(_eth_usd_aggregator);
    }

    function updateUsdcUsdAggregatorAddress(address _usdc_usd_aggregator) public onlyOwner() {
        usdc_usd_aggregator = AggregatorV3Interface(_usdc_usd_aggregator);
    }
}