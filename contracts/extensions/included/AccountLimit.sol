// SPDX-License-Identifier: MIT

pragma solidity ^0.8.6;

import '@openzeppelin/contracts/access/Ownable.sol';

contract AccountLimit is Ownable {
    mapping(address => bool) private _isExcludedFromAccountLimit;

    uint256 public accountLimit = type(uint256).max;

    event AccountLimitExclusion(address indexed account, bool isExcluded);

    function setAccountLimit(uint256 amount) external onlyOwner {
        _setAccountLimit(amount);
    }

    function setAccountLimitExclusion(address account, bool isExcluded) external onlyOwner {
        _setAccountLimitExclusion(account, isExcluded);
    }

    function isExcludedFromAccountLimit(address account) public view returns (bool) {
        return _isExcludedFromAccountLimit[account];
    }

    function _setAccountLimit(uint256 amount) internal {
        accountLimit = amount;
    }

    function _setAccountLimitExclusion(address account, bool isExcluded) internal {
        _isExcludedFromAccountLimit[account] = isExcluded;
        emit AccountLimitExclusion(account, isExcluded);
    }

    function _checkAccountLimit(
        address recipient,
        uint256 amount,
        uint256 recipientBalance
    ) internal view {
        if (!isExcludedFromAccountLimit(recipient)) {
            require(
                recipientBalance + amount <= accountLimit,
                'AccountLimit: Recipient has reached account tokens limit'
            );
        }
    }
}
