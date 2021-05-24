// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import '@openzeppelin/contracts/utils/Context.sol';
import '@openzeppelin/contracts/access/AccessControl.sol';

contract WhitelistAccess is Context, AccessControl {
    bytes32 public constant WHITELISTED_ROLE = keccak256('WHITELISTED_ROLE');

    event WhitelistedAdded(address indexed account);
    event WhitelistedRemoved(address indexed account);

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    modifier onlyWhitelisted() {
        require(isWhitelisted(_msgSender()), 'WhitelistedRole: caller does not have the Whitelisted role');
        _;
    }

    function isWhitelisted(address account) public view returns (bool) {
        return hasRole(WHITELISTED_ROLE, account);
    }

    function addWhitelisted(address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _addWhitelisted(account);
    }

    function removeWhitelisted(address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _removeWhitelisted(account);
    }

    function renounceWhitelisted() public {
        _removeWhitelisted(_msgSender());
    }

    function _addWhitelisted(address account) internal {
        _setupRole(WHITELISTED_ROLE, account);
        emit WhitelistedAdded(account);
    }

    function _removeWhitelisted(address account) internal {
        revokeRole(WHITELISTED_ROLE, account);
        emit WhitelistedRemoved(account);
    }
}
