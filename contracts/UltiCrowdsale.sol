// SPDX-License-Identifier: GPLv3

pragma solidity ^0.8.0;

import './crowdsale/Crowdsale.sol';
import './crowdsale/TimedCrowdsale.sol';
import './crowdsale/PostDeliveryCrowdsale.sol';
import './crowdsale/WhitelistAccess.sol';
import '@openzeppelin/contracts/access/AccessControl.sol';

contract UltiCrowdsale is Crowdsale, TimedCrowdsale, PostDeliveryCrowdsale, WhitelistAccess {
    uint256 OPENING_TIME = 1623427200; // Fri Jun 11 2021 16:00:00 UTC
    uint256 FIRST_100_CLOSING_TIME = 1623513600; // Sat Jun 12 2021 16:00:00 UTC
    uint256 PRIVATE_SALE_CLOSING_TIME = 1624723200; // Sat Jun 26 2021 16:00:00 UTC
    uint256 PRESALE_1_CLOSING_TIME = 1625932800; // Sat Jul 10 2021 16:00:00 UTC
    uint256 PRESALE_2_CLOSING_TIME = 1627142400; // Sat Jul 24 2021 16:00:00 UTC
    uint256 PRESALE_3_CLOSING_TIME = 1628352000; // Sat Aug 07 2021 16:00:00 UTC
    uint256 PRESALE_4_CLOSING_TIME = 1629561600; // Sat Aug 21 2021 16:00:00 UTC
    uint256 PRESALE_5_CLOSING_TIME = 1630771200; // Sat Sep 04 2021 16:00:00 UTC
    
    uint256 MINIMAL_CONTRIBUTION = 5 * 1e17; // 0.5 BNB
    uint256 MAXIMAL_CONTRIBUTION = 5 * 1e18; // 5 BNB
    
    uint256 PRIVATE_SALE_CAP = 2500 * 1e18; // 2500 BNB
    uint256 PRESALE_1_CAP = 3500 * 1e18; // 3500 BNB
    uint256 PRESALE_2_CAP = 6000 * 1e18; // 6000 BNB
    uint256 PRESALE_3_CAP = 6000 * 1e18; // 9000 BNB
    uint256 PRESALE_4_CAP = 13750 * 1e18; // 13750 BNB
    uint256 PRESALE_5_CAP = 18000 * 1e18; // 18000 BNB
    
    uint256 PRIVATE_SALE_RATE = 5263157; // 1 ULTI / 0.00000019 BNB
    uint256 PRESALE_1_RATE = 2222222; // 1 ULTI / 0.00000045 BNB
    uint256 PRESALE_2_RATE = 1408450; // 1 ULTI / 0.00000071 BNB
    uint256 PRESALE_3_RATE = 1030927; // 1 ULTI / 0.00000097 BNB
    uint256 PRESALE_4_RATE = 800000; // 1 ULTI / 0.00000125 BNB
    uint256 PRESALE_5_RATE = 666666; // 1 ULTI / 0.00000150 BNB    
    
    uint256 PRIVATE_SALE_BONUS_PCT = 30; // 30 %
    uint256 PRESALE_1_BONUS_PCT = 10; // 10 %
    uint256 PRESALE_2_BONUS_PCT = 5; // 5 %
    uint256 PRESALE_3_BONUS_PCT = 3; // 3 %

    constructor(address payable wallet_, IERC20 token_)
        Crowdsale(1, wallet_, token_)
        TimedCrowdsale(OPENING_TIME, PRESALE_5_CLOSING_TIME)
    {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function _preValidatePurchase(address beneficiary, uint256 weiAmount)
        internal
        view
        override(Crowdsale, TimedCrowdsale)
        onlyWhileOpen
    {
        Crowdsale._preValidatePurchase(beneficiary, weiAmount);
    }

    function _processPurchase(address beneficiary, uint256 tokenAmount)
        internal
        virtual
        override(Crowdsale, PostDeliveryCrowdsale)
    {
        PostDeliveryCrowdsale._processPurchase(beneficiary, tokenAmount);
    }
}
