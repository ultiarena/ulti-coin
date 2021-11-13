// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

import '@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol';
import '@openzeppelin/contracts//access/AccessControl.sol';

/*
 *    |  \  |  \|  \      |        \|      \       /      \           |  \
 *    | $$  | $$| $$       \$$$$$$$$ \$$$$$$      |  $$$$$$\  ______   \$$ _______
 *    | $$  | $$| $$         | $$     | $$        | $$   \$$ /      \ |  \|       \
 *    | $$  | $$| $$         | $$     | $$        | $$      |  $$$$$$\| $$| $$$$$$$\
 *    | $$  | $$| $$         | $$     | $$        | $$   __ | $$  | $$| $$| $$  | $$
 *    | $$__/ $$| $$_____    | $$    _| $$_       | $$__/  \| $$__/ $$| $$| $$  | $$
 *     \$$    $$| $$     \   | $$   |   $$ \       \$$    $$ \$$    $$| $$| $$  | $$
 *      \$$$$$$  \$$$$$$$$    \$$    \$$$$$$        \$$$$$$   \$$$$$$  \$$ \$$   \$$
 */

contract UltiCoin is AccessControl, ERC20Burnable {
    struct AccountStatus {
        bool accountLimitExcluded;
        bool transferLimitExcluded;
        bool blacklisted;
    }

    bytes32 public constant MINTER_ROLE = keccak256('MINTER_ROLE');

    mapping(address => AccountStatus) public statuses;

    uint256 public cap;
    uint256 public accountLimit;
    uint256 public transferLimit;

    event AccountLimitExclusion(address indexed account, bool isExcluded);
    event TransferLimitExclusion(address indexed account, bool isExcluded);

    constructor(
        address admin,
        uint256 cap_,
        uint256 accountLimit_,
        uint256 transferLimit_
    ) ERC20('ULTI Coin', 'ULTI') {
        require(admin != address(0), 'Admin is zero address');
        require(cap_ > 0, 'Cap is 0');
        require(accountLimit_ > 0, 'Account limit is 0');
        require(transferLimit_ > 0, 'Transfer limit is 0');

        // Grant all roles to given address
        _setupRole(DEFAULT_ADMIN_ROLE, admin);
        _setupRole(MINTER_ROLE, admin);

        // Exclude the admin and zero address from restrictions
        statuses[admin] = AccountStatus(true, true, false);
        statuses[address(0)] = AccountStatus(true, true, false);

        // Set initial settings
        cap = cap_;
        accountLimit = accountLimit_;
        transferLimit = transferLimit_;
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    function setAccountLimit(uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        accountLimit = amount;
    }

    function setTransferLimit(uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        transferLimit = amount;
    }

    function setCap(uint256 cap_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(cap_ >= totalSupply(), 'Cap is too low');
        cap = cap_;
    }

    function setAccountLimitExclusion(address[] calldata accounts, bool isExcluded)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        for (uint256 i = 0; i < accounts.length; i++) {
            statuses[accounts[i]].accountLimitExcluded = isExcluded;
            emit AccountLimitExclusion(accounts[i], isExcluded);
        }
    }

    function setTransferLimitExclusion(address[] calldata accounts, bool isExcluded)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        for (uint256 i = 0; i < accounts.length; i++) {
            statuses[accounts[i]].transferLimitExcluded = isExcluded;
            emit TransferLimitExclusion(accounts[i], isExcluded);
        }
    }

    function setBlacklisting(address[] calldata accounts, bool isBlacklisted) external onlyRole(DEFAULT_ADMIN_ROLE) {
        for (uint256 i = 0; i < accounts.length; i++) {
            statuses[accounts[i]].blacklisted = isBlacklisted;
        }
    }

    function withdrawERC20(
        IERC20 token,
        address to,
        uint256 amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(amount <= token.balanceOf(address(this)), 'Requested amount exceeds balance');
        token.transfer(to, amount);
    }

    function _mint(address account, uint256 amount) internal override {
        require(totalSupply() + amount <= cap, 'Cap exceeded');
        super._mint(account, amount);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal view override {
        _checkBlacklisting(from, to);
        _checkTransferLimit(from, to, amount);
        _checkAccountLimit(to, amount);
    }

    function _checkBlacklisting(address from, address to) private view {
        require(!statuses[from].blacklisted, 'Sender is blacklisted');
        require(!statuses[to].blacklisted, 'Recipient is blacklisted');
    }

    function _checkTransferLimit(
        address from,
        address to,
        uint256 amount
    ) private view {
        if (!statuses[from].transferLimitExcluded && !statuses[to].transferLimitExcluded) {
            require(amount <= transferLimit, 'Transfer amount exceeds the limit');
        }
    }

    function _checkAccountLimit(address to, uint256 amount) private view {
        if (!statuses[to].accountLimitExcluded) {
            require(balanceOf(to) + amount <= accountLimit, 'Recipient has reached account limit');
        }
    }
}
