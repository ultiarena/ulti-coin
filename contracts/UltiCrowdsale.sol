// SPDX-License-Identifier: GPLv3

pragma solidity ^0.8.0;

import './crowdsale/Crowdsale.sol';
import './crowdsale/TimedCrowdsale.sol';
import './crowdsale/PostDeliveryCrowdsale.sol';
import './crowdsale/WhitelistAccess.sol';
import '@openzeppelin/contracts/access/AccessControl.sol';

contract UltiCrowdsale is Crowdsale, TimedCrowdsale, PostDeliveryCrowdsale, WhitelistAccess {
    enum CrowdsaleStage {Inactive, FirstHundred, PrivateSale, Presale1, Presale2, Presale3, Presale4, Presale5}

    struct CrowdsaleStageData {
        uint256 closingTime;
        uint256 rate;
        uint256 bonus;
        uint256 cap;
        uint256 startCap;
        uint256 weiRaised;
    }

    mapping(CrowdsaleStage => CrowdsaleStageData) private _stages;

    uint256 OPENING_TIME = 1623427200; // 11-06-2021 16:00 UTC
    uint256 CLOSING_TIME = 1630771200; // 04-09-2021 16:00 UTC

    uint256 MINIMAL_CONTRIBUTION = 5 * 1e17; // 0.5 BNB
    uint256 MAXIMAL_CONTRIBUTION = 5 * 1e18; // 5 BNB

    constructor(address payable wallet_, IERC20 token_)
        Crowdsale(1, wallet_, token_)
        TimedCrowdsale(OPENING_TIME, CLOSING_TIME)
    {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);

        _setupCrowdsaleStage(CrowdsaleStage.Inactive, 0, 0, 0, 0, 0);
        // closing: 12-06-2021 16:00 UTC, rate: 1 / 0.00000019 BNB, bonus: 30%, cap: 2500 BNB, startCap: 0
        _setupCrowdsaleStage(CrowdsaleStage.FirstHundred, 1623513600, 5263157, 30, 2500 * 1e18, 0);
        // closing: 26-06-2021 16:00 UTC, rate: 1 / 0.00000019 BNB, bonus: 30%, cap: 2500 BNB, startCap: 0
        _setupCrowdsaleStage(CrowdsaleStage.PrivateSale, 1624723200, 5263157, 30, 2500 * 1e18, 0);
        // closing: 10-07-2021 16:00 UTC, rate: 1 / 0.00000045 BNB, bonus: 10%, cap: 3500 BNB, startCap: 2500 BNB
        _setupCrowdsaleStage(CrowdsaleStage.Presale1, 1625932800, 2222222, 10, 3500 * 1e18, 2500 * 1e18);
        // closing: 24-07-2021 16:00 UTC, rate: 1 / 0.00000071 BNB, bonus: 5%, cap: 6000 BNB, startCap: 6000 BNB
        _setupCrowdsaleStage(CrowdsaleStage.Presale2, 1627142400, 1408450, 5, 6000 * 1e18, 6000 * 1e18);
        // closing: 07-08-2021 16:00 UTC, rate: 1 / 0.00000097 BNB, bonus: 3%, cap: 9000 BNB, startCap: 12000 BNB
        _setupCrowdsaleStage(CrowdsaleStage.Presale3, 1628352000, 1030927, 3, 9000 * 1e18, 12000 * 1e18);
        // closing: 21-08-2021 16:00 UTC, rate: 1 / 0.00000125 BNB, bonus: 0%, cap: 13750 BNB, startCap: 21000 BNB
        _setupCrowdsaleStage(CrowdsaleStage.Presale4, 1629561600, 800000, 0, 13750 * 1e18, 21000 * 1e18);
        // closing: 04-09-2021 16:00 UTC, rate: 1 / 0.00000150 BNB, bonus: 0%, cap: 18000 BNB, startCap: 34750 BNB
        _setupCrowdsaleStage(CrowdsaleStage.Presale5, 1630771200, 666666, 0, 18000 * 1e18, 34750 * 1e18);
    }

    function rate() public view override(Crowdsale) returns (uint256) {
        return _stages[_currentStage()].rate;
    }

    function stage() public view returns (CrowdsaleStage) {
        return _currentStage();
    }

    function _preValidatePurchase(address beneficiary, uint256 weiAmount)
        internal
        view
        override(Crowdsale, TimedCrowdsale)
        onlyWhileOpen
    {
        CrowdsaleStage stage_ = _currentStage();
        if (stage_ == CrowdsaleStage.FirstHundred || stage_ == CrowdsaleStage.PrivateSale) {
            require(
                weiAmount >= MINIMAL_CONTRIBUTION && weiAmount <= MAXIMAL_CONTRIBUTION,
                'UltiCrowdsale: value sent is too low or too high'
            );
            if (stage_ == CrowdsaleStage.FirstHundred) {
                // is whitelisted
                // solhint-disable-previous-line no-empty-blocks
            }
        }

        Crowdsale._preValidatePurchase(beneficiary, weiAmount);
    }

    function _getTokenAmount(uint256 weiAmount) internal view override(Crowdsale) returns (uint256) {
        return weiAmount * rate();
    }

    function _processPurchase(address beneficiary, uint256 tokenAmount)
        internal
        override(Crowdsale, PostDeliveryCrowdsale)
    {
        PostDeliveryCrowdsale._processPurchase(beneficiary, tokenAmount);
    }

    function _updatePurchasingState(address beneficiary, uint256 weiAmount) internal override(Crowdsale) {
        // solhint-disable-previous-line no-empty-blocks
    }

    function _postValidatePurchase(address beneficiary, uint256 weiAmount) internal view override(Crowdsale) {
        // solhint-disable-previous-line no-empty-blocks
    }

    function _currentStage() public view returns (CrowdsaleStage) {
        if (!isOpen()) {
            return CrowdsaleStage.Inactive;
        }

        uint256 lastBlockTimestamp = block.timestamp;

        if (lastBlockTimestamp > _stages[CrowdsaleStage.Presale4].closingTime) {
            return CrowdsaleStage.Presale5;
        } else if (lastBlockTimestamp > _stages[CrowdsaleStage.Presale3].closingTime) {
            return CrowdsaleStage.Presale4;
        } else if (lastBlockTimestamp > _stages[CrowdsaleStage.Presale2].closingTime) {
            return CrowdsaleStage.Presale3;
        } else if (lastBlockTimestamp > _stages[CrowdsaleStage.Presale1].closingTime) {
            return CrowdsaleStage.Presale2;
        } else if (lastBlockTimestamp > _stages[CrowdsaleStage.PrivateSale].closingTime) {
            return CrowdsaleStage.Presale1;
        } else if (lastBlockTimestamp > _stages[CrowdsaleStage.FirstHundred].closingTime) {
            return CrowdsaleStage.PrivateSale;
        } else {
            return CrowdsaleStage.FirstHundred;
        }
    }

    function _setupCrowdsaleStage(
        CrowdsaleStage stage_,
        uint256 closingTime_,
        uint256 rate_,
        uint256 bonus_,
        uint256 cap_,
        uint256 startingCap_
    ) private {
        _stages[stage_] = CrowdsaleStageData(closingTime_, rate_, bonus_, cap_, startingCap_, 0);
    }
}
