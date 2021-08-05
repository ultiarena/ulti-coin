// SPDX-License-Identifier: MIT

pragma solidity ^0.8.6;

import '@openzeppelin/contracts/access/Ownable.sol';

contract BotBlacklist is Ownable {
    mapping(address => bool) private blacklistedBots;

    event BlacklistingBot(address indexed account, bool isBlacklisted);

    function setBotsBlacklisting(address[] memory bots, bool isBlacklisted) public onlyOwner {
        for (uint256 i = 0; i < bots.length; i++) {
            _setBotBlacklisting(bots[i], isBlacklisted);
        }
    }

    function isBlacklistedBot(address account) public view returns (bool) {
        return blacklistedBots[account];
    }

    function _setBotBlacklisting(address account, bool isBlacklisted) internal {
        blacklistedBots[account] = isBlacklisted;
        emit BlacklistingBot(account, isBlacklisted);
    }

    function _checkBotBlacklisting(address sender, address recipient) internal view {
        require(!blacklistedBots[sender], 'BotBlacklist: Sender is blacklisted');
        require(!blacklistedBots[recipient], 'BotBlacklist: Recipient is blacklisted');
    }
}
