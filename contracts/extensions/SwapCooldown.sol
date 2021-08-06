// SPDX-License-Identifier: MIT

pragma solidity ^0.8.6;

import '@openzeppelin/contracts/access/Ownable.sol';

contract SwapCooldown is Ownable {
    mapping(address => uint256) private swapCooldowns;

    mapping(address => bool) private _isExcludedFromSwapCooldown;

    uint256 public swapCooldownDuration = 0;

    event SwapCooldownExclusion(address indexed account, bool isExcluded);

    function setSwapCooldownDuration(uint256 duration) external onlyOwner {
        _setSwapCooldownDuration(duration);
    }

    function isExcludedFromSwapCooldown(address account) public view returns (bool) {
        return _isExcludedFromSwapCooldown[account];
    }

    function _swapCooldown(address account) internal view returns (uint256) {
        return swapCooldowns[account];
    }

    function _setSwapCooldown(address account) internal {
        swapCooldowns[account] = block.timestamp + swapCooldownDuration;
    }

    function _setSwapCooldownDuration(uint256 duration) internal {
        swapCooldownDuration = duration;
    }

    function _setSwapCooldownExclusion(address account, bool isExcluded) internal {
        _isExcludedFromSwapCooldown[account] = isExcluded;
        emit SwapCooldownExclusion(account, isExcluded);
    }

    function _checkSwapCooldown(
        address sender,
        address recipient,
        address swapPair,
        address swapRouter
    ) internal {
        if (
            swapCooldownDuration > 0 &&
            !isExcludedFromSwapCooldown(recipient) &&
            sender == swapPair &&
            recipient != swapRouter
        ) {
            require(_swapCooldown(recipient) < block.timestamp, 'SwapCooldown: Swap is cooling down');
            _setSwapCooldown(recipient);
        }
    }
}
