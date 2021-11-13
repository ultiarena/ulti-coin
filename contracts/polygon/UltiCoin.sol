// SPDX-License-Identifier: MIT

pragma solidity ^0.8.10;

import '@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol';
import '@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol';
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

contract UltiCoinBsc is AccessControl, ERC20Burnable, ERC20Pausable {
    struct AccountStatus {
        bool accountLimitExcluded;
        bool transferLimitExcluded;
        bool blacklisted;
    }

    bytes32 public constant MINTER_ROLE = keccak256('MINTER_ROLE');
    bytes32 public constant PAUSER_ROLE = keccak256('PAUSER_ROLE');

    uint256 public accountLimit;
    uint256 public transferLimit;
    uint256 public launchTime;

    mapping(address => AccountStatus) public statuses;
    uint256 public cap;

    event AccountLimitExclusion(address indexed account, bool isExcluded);
    event TransferLimitExclusion(address indexed account, bool isExcluded);

    constructor(address admin, uint256 cap_) ERC20('ULTI Coin', 'ULTI') {
        require(admin != address(0), 'Admin is zero address');
        require(cap_ > 0, 'Cap is 0');

        // Grant all roles to given address
        _setupRole(DEFAULT_ADMIN_ROLE, admin);
        _setupRole(MINTER_ROLE, admin);
        _setupRole(PAUSER_ROLE, admin);

        // Exclude the admin and this contract from restrictions
        statuses[admin] = AccountStatus(true, true, false);
        statuses[address(this)] = AccountStatus(true, true, false);

        // Set initial settings
        accountLimit = 150 * 10e6 * (10**18);
        transferLimit = 5 * 10e6 * (10**18);

        // Set cap
        cap = cap_;
    }

    function mint(address to, uint256 amount) public virtual onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    function pause() public virtual onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public virtual onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function setAccountLimit(uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        accountLimit = amount;
    }

    function setTransferLimit(uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        transferLimit = amount;
    }

    function launch() external onlyRole(DEFAULT_ADMIN_ROLE) {
        launchTime = block.timestamp;
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

    function setLowerCap(uint256 cap_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(cap_ <= cap, 'Cap is too high');
        require(cap_ >= totalSupply(), 'Cap is too low');
        cap = cap_;
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override(ERC20, ERC20Pausable) {
        super._beforeTokenTransfer(from, to, amount);

        _blacklistFrontRunners(from);
        _checkBlacklisting(from, to);
        _checkTransferLimit(from, to, amount);
        _checkAccountLimit(to, amount);
    }

    function _mint(address account, uint256 amount) internal virtual override {
        require(totalSupply() + amount <= cap, 'Cap exceeded');
        super._mint(account, amount);
    }

    function _burn(address account, uint256 amount) internal virtual override(ERC20) {
        super._burn(account, amount);
    }

    function _blacklistFrontRunners(address from) private {
        if (launchTime == 0 || block.timestamp < launchTime + 5 seconds) {
            if (!statuses[from].transferLimitExcluded) {
                statuses[from].blacklisted = true;
            }
        }
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
