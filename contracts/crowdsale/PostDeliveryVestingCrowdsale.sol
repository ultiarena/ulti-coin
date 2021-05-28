// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import './TimedCrowdsale.sol';

/**
 * @title PostDeliveryVestingCrowdsale
 * @dev Crowdsale that locks tokens from withdrawal until it ends.
 */
abstract contract PostDeliveryVestingCrowdsale is TimedCrowdsale {
    mapping(address => uint256) private _balances;

    mapping(address => uint256) private _released;

    // Number of tokens sold
    uint256 private _tokensSold;

    uint256 private _cliff;
    uint256 private _start;
    uint256 private _duration;
    uint256 private _initialPercent;

    constructor(
        uint256 startOffset_,
        uint256 cliffDuration_,
        uint256 duration_,
        uint256 initialPercent_
    ) {
        require(
            cliffDuration_ <= duration_,
            'PostDeliveryVestingCrowdsale: Cliff has to be lower or equal to duration'
        );
        require(initialPercent_ <= 100, 'PostDeliveryVestingCrowdsale: Initial percent has to be lower than 100%');
        _start = closingTime() + startOffset_;
        _cliff = _start + cliffDuration_;
        _duration = duration_;
        _initialPercent = initialPercent_;
    }

    function vestingStart() public view returns (uint256) {
        return _start;
    }

    function vestingCliff() public view returns (uint256) {
        return _cliff;
    }

    function vestingEnd() public view returns (uint256) {
        return _start + _duration;
    }

    /**
     * @return the balance of an account.
     */
    function tokensBought(address account) public view returns (uint256) {
        return _balances[account];
    }

    /**
     * @return the number of tokens sold.
     */
    function tokensSold() public view returns (uint256) {
        return _tokensSold;
    }

    function releasableAmount(address beneficiary) public view returns (uint256) {
        return _vestedAmount(beneficiary) - _released[beneficiary];
    }

    /**
     * @dev after crowdsale ends it releases tokens from vesting.
     * @param beneficiary Whose tokens will be withdrawn.
     */
    function releaseTokens(address beneficiary) public {
        require(beneficiary != address(0), 'PostDeliveryVestingCrowdsale: beneficiary is the zero address');
        require(hasClosed(), 'PostDeliveryVestingCrowdsale: not closed');
        require(
            _balances[beneficiary] - _released[beneficiary] > 0,
            'PostDeliveryVestingCrowdsale: beneficiary is not due any tokens'
        );
        uint256 amount = releasableAmount(beneficiary);
        require(amount > 0, 'PostDeliveryVestingCrowdsale: beneficiary tokens are vested');
        _released[beneficiary] = _released[beneficiary] + amount;
        _deliverTokens(beneficiary, amount);
    }

    function _vestedAmount(address beneficiary) internal view returns (uint256) {
        uint256 lastBlockTimestamp = block.timestamp;
        if (block.timestamp < _cliff) {
            return (_balances[beneficiary] * _initialPercent) / 100;
        } else if (lastBlockTimestamp >= _start + _duration) {
            return _balances[beneficiary];
        } else {
            return (_balances[beneficiary] * (lastBlockTimestamp - _start)) / _duration;
        }
    }

    /**
     * @dev Overrides parent by storing due balances, and delivering tokens to the vault instead of the end user. This
     * ensures that the tokens will be available by the time they are withdrawn (which may not be the case if
     * `_deliverTokens` was called later).
     * @param beneficiary Token purchaser
     * @param tokenAmount Amount of tokens purchased
     */
    function _processPurchase(address beneficiary, uint256 tokenAmount) internal virtual override {
        _balances[beneficiary] = _balances[beneficiary] + tokenAmount;
        _tokensSold = _tokensSold += tokenAmount;
    }
}
