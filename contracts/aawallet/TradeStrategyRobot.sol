// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import "@uniswap/v3-core/contracts/libraries/OracleLibrary.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

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

// 根据tick查报价
interface IOracleLibrary {
    function getQuoteAtTick(
        int24 tick,
        uint128 baseAmount,
        address baseToken,
        address quoteToken
    ) external pure returns (uint256 quoteAmount);
}

contract TradeStrategyRobot is Ownable{
    // 维护一个strategyId
    uint256 private _strategyId = 0;

    // 价格波动阈值
    uint256 private _priceThreshold = 0.01;

    // strategyId -> owner
    mapping(uint256 => address) private _strategyOwners;

    // strategyId -> 交易策略内容（hash）
    mapping(uint256 => bytes32) private _strategyContents;

    ISwapRouter public swapRouter;
    IUniswapV3Factory public uniswapFactory;

    constructor(address swapRouterAddress, address uniswapFactoryAddress) {
        // 初始化SwapRouter实例
        swapRouter = ISwapRouter(swapRouterAddress);
        // 初始化UniswapV3Factory实例
        uniswapFactory = IUniswapV3Factory(uniswapFactoryAddress);
    }

    event swapSuccess(uint256 amountOut);

    // 添加策略
    function addStrategy(address tokenFrom, address tokenTo, uint256 tokenFromNum, uint256 price) public returns (uint256) {
        _strategyId++;
        bytes32 memory strategyValue = hashValue(tokenFrom, tokenTo, tokenFromNum, price);
        _strategyContents[_strategyId] = strategyValue;
        _strategyOwners[_strategyId] = msg.sender;
        return _strategyId;
    }

    // 执行交易
    function execSwap(uint256 strategyId, address tokenFrom, address tokenTo, uint256 tokenFromNum, uint256 price) public {
        // 只能由策略的owner发起交易
        require(msg.sender == strategyToOwner[strategyId], "Not the owner of the strategy");

        // 从Uniswap获取报价，验证报价是否在波动范围内
        address poolAddress = getPoolAddressFromTokenPair(tokenFrom, tokenTo);
        int24 tick = getCurrentTick(poolAddress);
        uint256 quoteAmount = IOracleLibrary.getQuoteAtTick(tick, tokenFromNum, tokenFrom, tokenTo);
        uint256 priceAbsDiff = quoteAmount > price ? quoteAmount - price : price - quoteAmount;
        require(priceAbsDiff < _priceThreshold, "Price difference is too large");
        
        // 验证策略是否一致
        bytes32 memory strategyValue = hashValue(tokenFrom, tokenTo, tokenFromNum, uint256(price));
        require(strategyToValue[strategyId] == strategyValue, "Strategy does not match");

        // 转移资产到本合约
        IERC20(tokenFrom).transferFrom(msg.sender, address(this), tokenFromNum);

        // 授权资产给Uniswap
        IERC20(tokenFrom).approve(swapRouterAddress, tokenFromNum);

        // 调用Uniswap的swap函数
        uint256 amountOut = swapRouter.exactInputSingle(
            tokenFrom,
            tokenTo,
            3000,
            msg.sender,
            block.timestamp,//
            tokenFromNum,
            0,//
            0//
        );

        emit swapSuccess(amountOut);
    }

    // 生成hash值
    function hashValue(address tokenFrom, address tokenTo, uint256 tokenFromNum, uint256 price) internal pure returns (bytes32 memory) {
        return keccak256(abi.encodePacked(tokenFrom, tokenTo, tokenFromNum, price));
    }

    // 从token对获取pool地址
    function getPoolAddressFromTokenPair(address tokenFrom, address tokenTo) internal view returns (address) {
        return uniswapFactory.getPool(tokenFrom, tokenTo, 3000);
    }

    // 拿tick
    function getCurrentTick(address poolAddress) public view returns (int24 tick) {
        IUniswapV3Pool pool = IUniswapV3Pool(poolAddress);
        (, tick, , , , , ) = pool.slot0();
    }

    // 修改价格波动阈值
    function setPriceThreshold(uint256 newPriceThreshold) public onlyOwner {
        _priceThreshold = newPriceThreshold;
    }
}
