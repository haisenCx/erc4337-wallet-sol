// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-periphery/contracts/libraries/OracleLibrary.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract AutoTrading is Ownable {

    // Maintain a strategyId
    uint256 private _strategyId = 0;

    // fee
    uint24 private _fee = 3000;

    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    // strategyId -> owner
    mapping(uint256 => address) private _strategyOwners;

    // A value for each policy corresponding to the expected revenue fluctuation threshold
    mapping(uint256 => uint256) private _strategyTokenToNumDIffThreshold;

    // strategyId -> Trading strategy content (hash)
    mapping(uint256 => bytes32) private _strategyContents;

    ISwapRouter public swapRouter;
    IUniswapV3Factory public uniswapFactory;
    address swapRouterAddr;

    event SwapSuccess(uint256 indexed _strategyId, uint256 amountOut);
    event AddStrategySuccess(address indexed owner, uint256 indexed _strategyId);

    constructor(address swapRouterAddress, address uniswapFactoryAddress) {
        swapRouterAddr = swapRouterAddress;
        swapRouter = ISwapRouter(swapRouterAddress);
        uniswapFactory = IUniswapV3Factory(uniswapFactoryAddress);
    }

    function addStrategy(address tokenFrom, address tokenTo, uint256 tokenFromNum, uint256 tokenToNum, uint256 tokenToNumDIffThreshold)
    public
    returns (uint256) {
        _strategyId++;
        bytes32 strategyValue = hashValue(tokenFrom, tokenTo, tokenFromNum, tokenToNum, tokenToNumDIffThreshold);
        _strategyContents[_strategyId] = strategyValue;
        _strategyOwners[_strategyId] = msg.sender;
        _strategyTokenToNumDIffThreshold[_strategyId] = tokenToNumDIffThreshold;

        emit AddStrategySuccess(msg.sender, _strategyId);

        return _strategyId;
    }

    function getTokenToNum(address tokenFrom, address tokenTo, uint256 tokenFromNum) public view returns (uint256) {
        address poolAddress = getPoolAddressFromTokenPair(tokenFrom, tokenTo);
        int24 tick = getCurrentTick(poolAddress);
        return OracleLibrary.getQuoteAtTick(tick, uint128(tokenFromNum), tokenFrom, tokenTo);
    }

    // Execute trades
    function execSwap(uint256 strategyId, address tokenFrom, address tokenTo, uint256 tokenFromNum, uint256 tokenToNum, uint256 tokenToNumDIffThreshold)
    public {
        // Transactions can only be initiated by the owner of the strategy
        require(msg.sender == _strategyOwners[strategyId], "Not the owner of the strategy");

        // Get a quote from Uniswap and verify that the quote is within the volatility range
        uint256 quoteAmount = getTokenToNum(tokenFrom, tokenTo, tokenFromNum);
        uint256 tokenToNumAbsDiff = quoteAmount > tokenToNum ? quoteAmount - tokenToNum : tokenToNum - quoteAmount;
        require(tokenToNumAbsDiff < _strategyTokenToNumDIffThreshold[strategyId],
        "TokenToNumber difference is too large");

        // Verify that the policies are consistent
        bytes32 strategyValue = hashValue(tokenFrom, tokenTo, tokenFromNum, tokenToNum, tokenToNumDIffThreshold);
        require(_strategyContents[strategyId] == strategyValue, "Strategy does not match");

        // Transfer of assets to this contract
        IERC20(tokenFrom).transferFrom(msg.sender, address(this), tokenFromNum);

        // Authorize assets to Uniswap
        IERC20(tokenFrom).approve(swapRouterAddr, tokenFromNum);

        // Call Uniswap swap function
        ISwapRouter.ExactInputSingleParams memory swapParams = ISwapRouter.ExactInputSingleParams(
            tokenFrom,
            tokenTo,
            _fee,
            msg.sender,
            block.timestamp, //
            tokenFromNum,
            0, //
            0//
        );
        uint256 amountOut = swapRouter.exactInputSingle(swapParams);

        // Verify that the conditions are not met and directly revert rollback
        if (amountOut < tokenToNum - tokenToNumAbsDiff) {
            revert("Swap failed");
        }

        emit SwapSuccess(strategyId, amountOut);
    }

    // Generate a hash value
    function hashValue(address tokenFrom, address tokenTo, uint256 tokenFromNum, uint256 tokenToNum, uint256 tokenToNumDIffThreshold) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(tokenFrom, tokenTo, tokenFromNum, tokenToNum));
    }

    // Get the pool address from the token pair
    function getPoolAddressFromTokenPair(address tokenFrom, address tokenTo) internal view returns (address) {
        return uniswapFactory.getPool(tokenFrom, tokenTo, _fee);
    }

    function getCurrentTick(address poolAddress) internal view returns (int24 tick) {
        IUniswapV3Pool pool = IUniswapV3Pool(poolAddress);
        (, tick,,,,,) = pool.slot0();
    }

    receive() external payable {
    }

    function getStrategyContent(uint256 strategyId) external view returns (bytes32) {
        return _strategyContents[strategyId];
    }

}
