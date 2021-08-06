// SPDX-License-Identifier: MIT

pragma solidity ^0.8.6;

import '@openzeppelin/contracts/access/Ownable.sol';

contract TransferLimit is Ownable {
    mapping(address => bool) private _isExcludedFromTransferLimit;

    uint256 public singleTransferLimit = type(uint256).max;

    event TransferLimitExclusion(address indexed account, bool isExcluded);

    function setSingleTransferLimit(uint256 amount) external onlyOwner {
        _setSingleTransferLimit(amount);
    }

    function setTransferLimitExclusion(address account, bool isExcluded) external onlyOwner {
        _setTransferLimitExclusion(account, isExcluded);
    }

    function isExcludedFromTransferLimit(address account) public view returns (bool) {
        return _isExcludedFromTransferLimit[account];
    }

    function _setSingleTransferLimit(uint256 amount) internal {
        singleTransferLimit = amount;
    }

    function _setTransferLimitExclusion(address account, bool isExcluded) internal {
        _isExcludedFromTransferLimit[account] = isExcluded;
        emit TransferLimitExclusion(account, isExcluded);
    }

    function _checkTransferLimit(
        address sender,
        address recipient,
        uint256 amount
    ) internal view {
        if (!isExcludedFromTransferLimit(sender) && !isExcludedFromTransferLimit(recipient)) {
            require(amount <= singleTransferLimit, 'TransferLimit: Transfer amount exceeds the limit');
        }
    }
}
