// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-periphery/contracts/libraries/OracleLibrary.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/*
// 拿pool的地址
interface IUniswapV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address);
}

// 查tick接口
interface IUniswapV3Pool {
    function slot0() external view returns (
        uint160 sqrtPriceX96,
        int24 tick,
        uint16 observationIndex,
        uint16 observationCardinality,
        uint16 observationCardinalityNext,
        uint8 feeProtocol,
        bool unlocked
    );
}

// 交易接口
interface ISwapRouter {
    function exactInputSingle(
        address tokenIn,
        address tokenOut,
        uint24 fee,
        address recipient,
        uint256 deadline,
        uint256 amountIn,
        uint256 amountOutMinimum,
        uint160 sqrtPriceLimitX96
    ) external returns (uint256 amountOut);
}

// 根据tick查报价
interface OracleLibrary {
    function getQuoteAtTick(
        int24 tick,
        uint128 baseAmount,
        address baseToken,
        address quoteToken
    ) external pure returns (uint256 quoteAmount);
}
*/

contract AutoTrading is Ownable {
    // 维护一个strategyId
    uint256 private _strategyId = 0;

    // TODO 与预期收入波动阈值，应该配置成每个策略对应一个值
    uint256 private _tokenToNumDIffThreshold = 1000;

    //fee
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

    // strategyId -> 交易策略内容（hash）
    mapping(uint256 => bytes32) private _strategyContents;

    ISwapRouter public swapRouter;
    IUniswapV3Factory public uniswapFactory;
    address swapRouterAddr;

    event SwapSuccess(uint256 _strategyId, uint256 amountOut);
    event AddStrategySuccess(address owner, uint256 _strategyId);

    constructor(address swapRouterAddress, address uniswapFactoryAddress) {
        swapRouterAddr = swapRouterAddress;
        // 初始化SwapRouter实例
        swapRouter = ISwapRouter(swapRouterAddress);
        // 初始化UniswapV3Factory实例
        uniswapFactory = IUniswapV3Factory(uniswapFactoryAddress);
    }

    // 添加策略
    function addStrategy(address tokenFrom, address tokenTo, uint256 tokenFromNum, uint256 price) public returns (uint256) {
        _strategyId++;
        bytes32 strategyValue = hashValue(tokenFrom, tokenTo, tokenFromNum, price);
        _strategyContents[_strategyId] = strategyValue;
        _strategyOwners[_strategyId] = msg.sender;

        emit AddStrategySuccess(msg.sender, _strategyId);

        return _strategyId;
    }

    function getTokenToNum(address tokenFrom, address tokenTo, uint256 tokenFromNum) public view returns (uint256) {
        address poolAddress = getPoolAddressFromTokenPair(tokenFrom, tokenTo);
        int24 tick = getCurrentTick(poolAddress);
        return OracleLibrary.getQuoteAtTick(tick, uint128(tokenFromNum), tokenFrom, tokenTo);
    }

    // 执行交易
    function execSwap(uint256 strategyId, address tokenFrom, address tokenTo, uint256 tokenFromNum, uint256 tokenToNum) public {
        // 只能由策略的owner发起交易
        require(msg.sender == _strategyOwners[strategyId], "Not the owner of the strategy");

        // 从Uniswap获取报价，验证报价是否在波动范围内
        uint256 quoteAmount = getTokenToNum(tokenFrom, tokenTo, tokenFromNum);
        uint256 priceAbsDiff = quoteAmount > tokenToNum ? quoteAmount - tokenToNum : tokenToNum - quoteAmount;
        require(priceAbsDiff < _tokenToNumDIffThreshold, "Price difference is too large");
        
        // 验证策略是否一致
        bytes32 strategyValue = hashValue(tokenFrom, tokenTo, tokenFromNum, tokenToNum);
        require(_strategyContents[strategyId] == strategyValue, "Strategy does not match");

        // 转移资产到本合约
        IERC20(tokenFrom).transferFrom(msg.sender, address(this), tokenFromNum);

        // 授权资产给Uniswap
        IERC20(tokenFrom).approve(swapRouterAddr, tokenFromNum);

        // 调用Uniswap的swap函数
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

        // TODO 添加验证，不满足条件直接revert回滚
        emit SwapSuccess(strategyId, amountOut);
    }

    // 生成hash值
    function hashValue(address tokenFrom, address tokenTo, uint256 tokenFromNum, uint256 price) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(tokenFrom, tokenTo, tokenFromNum, price));
    }

    // 从token对获取pool地址
    function getPoolAddressFromTokenPair(address tokenFrom, address tokenTo) internal view returns (address) {
        return uniswapFactory.getPool(tokenFrom, tokenTo, _fee);
    }

    // 拿tick
    function getCurrentTick(address poolAddress) internal view returns (int24 tick) {
        IUniswapV3Pool pool = IUniswapV3Pool(poolAddress);
        (, tick,,,,,) = pool.slot0();
    }

    // 修改价格波动阈值
    function setPriceThreshold(uint256 newPriceThreshold) internal onlyOwner {
        _tokenToNumDIffThreshold = newPriceThreshold;
    }

    // 接收Ether的receive函数
    receive() external payable {
    }

    function getStrategyContent(uint256 strategyId) external view returns (bytes32) {
        return _strategyContents[strategyId];
    }

}
