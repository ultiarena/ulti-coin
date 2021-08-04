// SPDX-License-Identifier: MIT

pragma solidity ^0.8.6;

import '@openzeppelin/contracts/access/Ownable.sol';

contract SwapCooldown is Ownable {
    bool private isCooldownEnabled = true;

    mapping(address => uint256) private cooldowns;

    uint256 public cooldownDuration = 1 minutes;

    function setCooldownDuration(uint256 duration) external onlyOwner() {
        _setCooldownDuration(duration);
    }

    function _cooldown(address account) internal view returns (uint256) {
        return cooldowns[account];
    }

    function _setCooldownDuration(uint256 duration) internal {
        cooldownDuration = duration;
    }

    function _setCooldown(address account) internal returns (uint256) {
        return cooldowns[account] = block.timestamp + cooldownDuration;
    }
}
