// SPDX-License-Identifier: MIT

pragma solidity ^0.8.6;

import '../interfaces/IUniswapV2Factory.sol';
import '../interfaces/IUniswapV2Pair.sol';
import '../interfaces/IUniswapV2Router02.sol';
import '@openzeppelin/contracts/utils/Context.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

contract Liquify is Context, Ownable {
    bool private isInSwapAndLiquify = false;

    IUniswapV2Router02 public swapRouter;
    address public swapPair;

    bool public isLiquifyingEnabled = true;

    uint256 public minAmountToLiquify;

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

    function withdrawFunds(uint256 amount) external onlyOwner() {
        payable(owner()).transfer(amount);
    }

    function switchLiquifying() external onlyOwner() {
        isLiquifyingEnabled = !isLiquifyingEnabled;
        emit LiquifyingSwitched(isLiquifyingEnabled);
    }

    function setMinAmountToLiquify(uint256 amount) external onlyOwner() {
        _setMinAmountToLiquify(amount);
    }

    function setRouterAddress(address routerAddress_) external onlyOwner() {
        _setRouterAddress(routerAddress_);
    }

    function _isInSwapAndLiquify() internal view returns (bool) {
        return isInSwapAndLiquify;
    }

    function _setMinAmountToLiquify(uint256 amount) internal {
        minAmountToLiquify = amount;
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
        path[1] = swapRouter.WETH();

        uint256 balance = address(this).balance;
        swapRouter.swapExactTokensForETHSupportingFeeOnTransferTokens(
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
            swapRouter.addLiquidityETH{value: ethAmount}(
                address(this),
                tokenAmount,
                0, // slippage is unavoidable
                0, // slippage is unavoidable
                lpReceiver,
                block.timestamp
            );
        emit Liquified(amountToken, amountETH, liquidity);
    }

    function _setRouterAddress(address routerAddress_) private {
        IUniswapV2Router02 _swapRouter = IUniswapV2Router02(routerAddress_);
        swapPair = IUniswapV2Factory(_swapRouter.factory()).createPair(address(this), _swapRouter.WETH());
        swapRouter = _swapRouter;
        emit SwapPairCreated(swapPair);
    }
}