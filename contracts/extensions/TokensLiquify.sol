// SPDX-License-Identifier: MIT

pragma solidity ^0.8.6;

import '../interfaces/IPancakeFactory.sol';
import '../interfaces/IPancakeRouter02.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

contract TokensLiquify is Ownable {
    bool private isInSwapAndLiquify;

    IPancakeRouter02 public swapRouter;
    address public swapPair;

    bool public isLiquifyingEnabled;
    uint256 public minAmountToLiquify;

    event TokensSwapped(uint256 tokensSwapped, uint256 bnbReceived);
    event TokensLiquified(uint256 tokensLiquified, uint256 bnbLiquified, uint256 lpMinted);

    receive() external payable {}

    function withdrawFunds(uint256 amount) external onlyOwner {
        payable(owner()).transfer(amount);
    }

    function switchLiquifying() external onlyOwner {
        isLiquifyingEnabled = !isLiquifyingEnabled;
    }

    function setMinAmountToLiquify(uint256 amount) external onlyOwner {
        minAmountToLiquify = amount;
    }

    function setRouterAddress(address routerAddress_) external onlyOwner {
        _setRouterAddress(routerAddress_);
    }

    function _isInSwapAndLiquify() internal view returns (bool) {
        return isInSwapAndLiquify;
    }

    function _setRouterAddress(address routerAddress_) internal {
        IPancakeRouter02 _swapRouter = IPancakeRouter02(routerAddress_);
        swapPair = IPancakeFactory(_swapRouter.factory()).createPair(address(this), _swapRouter.WETH());
        swapRouter = _swapRouter;
    }

    function _swapAndLiquify(uint256 tokenAmount, address lpReceiver) internal {
        isInSwapAndLiquify = true;
        uint256 firstHalf = tokenAmount / 2;
        uint256 otherHalf = tokenAmount - firstHalf;
        uint256 bnbReceived = _swapTokensForBNB(firstHalf);
        _addLiquidity(otherHalf, bnbReceived, lpReceiver);
        isInSwapAndLiquify = false;
    }

    function _swapTokensForBNB(uint256 tokenAmount) private returns (uint256) {
        address[] memory path = new address[](2);
        path[0] = address(this);
        path[1] = swapRouter.WETH();

        uint256 balance = address(this).balance;
        swapRouter.swapExactTokensForETHSupportingFeeOnTransferTokens(
            tokenAmount,
            0, // accept any amount of BNB
            path,
            address(this),
            block.timestamp
        );
        uint256 newBalance = address(this).balance;
        uint256 bnbReceived = newBalance - balance;
        emit TokensSwapped(tokenAmount, bnbReceived);
        return bnbReceived;
    }

    function _addLiquidity(
        uint256 tokenAmount,
        uint256 bnbAmount,
        address lpReceiver
    ) private {
        (uint256 amountToken, uint256 amountBNB, uint256 liquidity) =
            swapRouter.addLiquidityETH{value: bnbAmount}(
                address(this),
                tokenAmount,
                0, // slippage is unavoidable
                0, // slippage is unavoidable
                lpReceiver,
                block.timestamp
            );
        emit TokensLiquified(amountToken, amountBNB, liquidity);
    }
}
