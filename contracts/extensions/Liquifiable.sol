// SPDX-License-Identifier: MIT

pragma solidity ^0.8.6;

import '../interfaces/IUniswapV2Factory.sol';
import '../interfaces/IUniswapV2Pair.sol';
import '../interfaces/IUniswapV2Router02.sol';
import '@openzeppelin/contracts/utils/Context.sol';

contract Liquifiable is Context {
    bool private isInSwapAndLiquify = false;

    IUniswapV2Router02 public uniswapRouter;
    address public uniswapV2Pair;

    bool public isLiquifyingEnabled = true;

    event SwapPairCreated(address uniswapPair);
    event LiquifyingSwitched(bool enabled);
    event Swapped(uint256 tokensSwapped, uint256 ethReceived);
    event Liquified(uint256 tokensLiquified, uint256 ethLiquified, uint256 lpMinted);

    modifier lockTheSwap {
        isInSwapAndLiquify = true;
        _;
        isInSwapAndLiquify = false;
    }

    constructor(address routerAddress_) {
        _setRouterAddress(routerAddress_);
    }

    receive() external payable {}

    function _isInSwapAndLiquify() internal view returns (bool) {
        return isInSwapAndLiquify;
    }

    function _setRouterAddress(address routerAddress_) internal {
        IUniswapV2Router02 _uniswapRouter = IUniswapV2Router02(routerAddress_);
        uniswapV2Pair = IUniswapV2Factory(_uniswapRouter.factory()).createPair(address(this), _uniswapRouter.WETH());
        uniswapRouter = _uniswapRouter;

        emit SwapPairCreated(uniswapV2Pair);
    }

    function _switchLiquifying() internal {
        isLiquifyingEnabled = !isLiquifyingEnabled;
        emit LiquifyingSwitched(isLiquifyingEnabled);
    }

    function _swapAndLiquify(uint256 tokenAmount, address lpReceiver) internal lockTheSwap {
        uint256 firstHalf = tokenAmount / 2;
        uint256 otherHalf = tokenAmount - firstHalf;

        uint256 ethReceived = _swapTokensForETH(firstHalf);
        _addLiquidity(otherHalf, ethReceived, lpReceiver);
    }

    function _swapTokensForETH(uint256 tokenAmount) private returns (uint256) {
        address[] memory path = new address[](2);
        path[0] = address(this);
        path[1] = uniswapRouter.WETH();

        uint256 balance = address(this).balance;
        uniswapRouter.swapExactTokensForETHSupportingFeeOnTransferTokens(
            tokenAmount,
            0, // accept any amount of ETH
            path,
            address(this),
            block.timestamp
        );
        uint256 newBalance = address(this).balance;
        uint256 ethReceived = newBalance - balance;

        emit Swapped(tokenAmount, ethReceived);

        return ethReceived;
    }

    function _addLiquidity(
        uint256 tokenAmount,
        uint256 ethAmount,
        address lpReceiver
    ) private {
        (uint256 amountToken, uint256 amountETH, uint256 liquidity) =
            uniswapRouter.addLiquidityETH{value: ethAmount}(
                address(this),
                tokenAmount,
                0, // slippage is unavoidable
                0, // slippage is unavoidable
                lpReceiver,
                block.timestamp
            );
        emit Liquified(amountToken, amountETH, liquidity);
    }
}
