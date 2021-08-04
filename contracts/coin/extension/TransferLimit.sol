// SPDX-License-Identifier: MIT

pragma solidity ^0.8.6;

import '@openzeppelin/contracts/access/Ownable.sol';

contract TransferLimit is Ownable {
    mapping(address => bool) private _isExcludedFromTransferLimit;

    uint256 private maxTransferAmount;

    event IncludedInTransferLimit(address indexed account);
    event ExcludedFromTransferLimit(address indexed account);

    function isExcludedFromTransferLimit(address account) public view returns (bool) {
        return _isExcludedFromTransferLimit[account];
    }

    function setMaxTransferAmount(uint256 amount) external onlyOwner() {
        _setMaxTransferAmount(amount);
    }

    function excludeFromTransferLimit(address account) external onlyOwner() {
        _excludeFromTransferLimit(account);
    }

    function includeInTransferLimit(address account) external onlyOwner() {
        _includeInTransferLimit(account);
    }

    function _maxTransferAmount() internal view returns (uint256) {
        return maxTransferAmount;
    }

    function _setMaxTransferAmount(uint256 amount) internal {
        maxTransferAmount = amount;
    }

    function _includeInTransferLimit(address account) internal {
        _isExcludedFromTransferLimit[account] = false;
        emit IncludedInTransferLimit(account);
    }

    function _excludeFromTransferLimit(address account) internal {
        _isExcludedFromTransferLimit[account] = true;
        emit ExcludedFromTransferLimit(account);
    }

    //    modifier transactionThrottler(
    //        address sender,
    //        address recipient,
    //        uint256 amount
    //    ) {
    //        if (_tradingStart > block.timestamp) {
    //            require(sender == owner() || recipient == owner(), 'Protection: Transfers disabled');
    //        } else if (_tradingStart <= block.timestamp && _restrictionEndTime > block.timestamp) {
    //            if (sender != owner() || recipient != owner()) {
    //                require(amount <= _maxTransferAmount, 'Protection: Limit exceeded');
    //            }
    //
    //            if (!_isWhitelisted[sender] && !_isWhitelisted[recipient]) {
    //                require(
    //                    _previousTx[sender] + 60 <= block.timestamp && _previousTx[recipient] + 60 <= block.timestamp,
    //                    'Protection: 1 tx/min allowed'
    //                );
    //                _previousTx[sender] = block.timestamp;
    //                _previousTx[recipient] = block.timestamp;
    //            } else if (!_isWhitelisted[recipient]) {
    //                require(_previousTx[recipient] + 60 <= block.timestamp, 'Protection: 1 tx/min allowed');
    //                _previousTx[recipient] = block.timestamp;
    //            } else if (!_isWhitelisted[sender]) {
    //                require(_previousTx[sender] + 60 <= block.timestamp, 'Protection: 1 tx/min allowed');
    //                _previousTx[sender] = block.timestamp;
    //            }
    //        }
    //        _;
    //    }
}
