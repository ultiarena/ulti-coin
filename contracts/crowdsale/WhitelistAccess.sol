// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import '@openzeppelin/contracts/utils/Context.sol';
import '@openzeppelin/contracts/access/AccessControl.sol';

contract WhitelistAccess is Context, AccessControl {
    /**
     * @dev Emitted when `account` is added to `whitelist`.
     */
    event WhitelistAdded(bytes32 indexed whitelist, address indexed account);

    /**
     * @dev Emitted when `account` is removed from `whitelist`.
     */
    event WhitelistRemoved(bytes32 indexed whitelist, address indexed account);

    constructor() {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Modifier that checks that an account is present on `whitelist`.
     */
    modifier onlyWhitelisted(bytes32 whitelist) {
        require(isWhitelisted(whitelist, _msgSender()), 'WhitelistAccess: caller is not whitelisted');
        _;
    }

    /**
     * @dev Returns `true` if `account` is present on `whitelist`.
     */
    function isWhitelisted(bytes32 whitelist, address account) public view returns (bool) {
        return hasRole(whitelist, account);
    }

    /**
     * @dev Adds `account` to `whitelist`.
     *
     * If `account` had been removed, emits a {WhitelistAdded} event.
     *
     * Requirements:
     *
     * - the caller must have ``role``'s admin role.
     */
    function addWhitelisted(bytes32 whitelist, address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _addWhitelisted(whitelist, account);
    }

    /**
     * @dev Removes `account` from `whitelist`.
     *
     * If `account` had been removed, emits a {WhitelistRemoved} event.
     *
     * Requirements:
     *
     * - the caller must have ``role``'s admin role.
     */
    function removeWhitelisted(bytes32 whitelist, address account) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _removeWhitelisted(whitelist, account);
    }

    /**
     * @dev Adds `account` to `whitelist`.
     */
    function _addWhitelisted(bytes32 whitelist, address account) internal {
        _setupRole(whitelist, account);
        emit WhitelistAdded(whitelist, account);
    }

    /**
     * @dev Removes `account` from `whitelist`.
     */
    function _removeWhitelisted(bytes32 whitelist, address account) internal {
        revokeRole(whitelist, account);
        emit WhitelistRemoved(whitelist, account);
    }
}
