// SPDX-License-Identifier: MIT

pragma solidity ^0.8.6;

import './extensions/TokensLiquify.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/utils/structs/EnumerableSet.sol';

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

contract UltiCoin is IERC20, Context, Ownable, TokensLiquify {
    using EnumerableSet for EnumerableSet.AddressSet;

    struct AccountStatus {
        bool feeExcluded;
        bool accountLimitExcluded;
        bool transferLimitExcluded;
        bool blacklistedBot;
        uint256 swapCooldown;
    }

    mapping(address => uint256) private _rOwned;
    mapping(address => uint256) private _tOwned;
    mapping(address => mapping(address => uint256)) private _allowances;

    EnumerableSet.AddressSet private _excludedFromReward;
    mapping(address => AccountStatus) private accountsStatuses;

    uint256 private _tTotal = 250 * 1e9 * 1e18;
    uint256 private _rTotal = (type(uint256).max - (type(uint256).max % _tTotal));
    uint256 private _tFeeTotal;
    uint256 private _tBurnTotal;
    uint256 private _tLiquidityTotal;

    uint256 private constant _tFeePercent = 2;
    uint256 private constant _tBurnPercent = 2;
    uint256 private constant _tLiquidityPercent = 2;

    string public constant name = 'ULTI Coin';
    string public constant symbol = 'ULTI';
    uint8 public constant decimals = 18;

    uint256 public accountLimit;
    uint256 public singleTransferLimit;
    uint256 public swapCooldownDuration;

    event RewardExclusion(address indexed account, bool isExcluded);
    event FeeExclusion(address indexed account, bool isExcluded);
    event AccountLimitExclusion(address indexed account, bool isExcluded);
    event TransferLimitExclusion(address indexed account, bool isExcluded);

    constructor(address owner, address router) TokensLiquify(router) {
        // Transfer ownership to given address
        transferOwnership(owner);

        // Exclude the owner and this contract from transfer restrictions
        accountsStatuses[owner] = AccountStatus(true, true, true, false, 0);
        accountsStatuses[address(this)] = AccountStatus(true, true, true, false, 0);

        // Exclude swap pair and swap router from account limit
        accountsStatuses[swapPair].accountLimitExcluded = true;
        accountsStatuses[address(swapRouter)].accountLimitExcluded = true;

        // Set initial settings
        accountLimit = 200 * 10e6 * (10**uint256(decimals));
        singleTransferLimit = 10 * 10e6 * (10**uint256(decimals));
        swapCooldownDuration = 1 minutes;
        minAmountToLiquify = 5000 * (10**uint256(decimals));

        // Assign initial supply to the owner
        _rOwned[owner] = _rTotal;
        emit Transfer(address(0), owner, _tTotal);
    }

    function allowance(address owner, address spender) external view override returns (uint256) {
        return _allowances[owner][spender];
    }

    function balanceOf(address account) external view override returns (uint256) {
        return _balanceOf(account);
    }

    function totalSupply() external view override returns (uint256) {
        return _tTotal;
    }

    function totalFees() external view returns (uint256) {
        return _tFeeTotal;
    }

    function totalBurned() external view returns (uint256) {
        return _tBurnTotal;
    }

    function isExcludedFromReward(address account) public view returns (bool) {
        return _excludedFromReward.contains(account);
    }

    function isExcludedFromFee(address account) external view returns (bool) {
        return accountsStatuses[account].feeExcluded;
    }

    function isExcludedFromAccountLimit(address account) external view returns (bool) {
        return accountsStatuses[account].accountLimitExcluded;
    }

    function isExcludedFromTransferLimit(address account) external view returns (bool) {
        return accountsStatuses[account].transferLimitExcluded;
    }

    function approve(address spender, uint256 amount) external override returns (bool) {
        _approve(_msgSender(), spender, amount);
        return true;
    }

    function transfer(address recipient, uint256 amount) external override returns (bool) {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external override returns (bool) {
        _transfer(sender, recipient, amount);

        uint256 currentAllowance = _allowances[sender][_msgSender()];
        require(currentAllowance >= amount, 'Transfer amount exceeds allowance');
        _approve(sender, _msgSender(), currentAllowance - amount);

        return true;
    }

    function reflect(uint256 tAmount) external {
        address account = _msgSender();
        require(!isExcludedFromReward(account), 'Reflect from excluded address');
        require(_balanceOf(account) >= tAmount, 'Reflect amount exceeds sender balance');

        uint256 currentRate = _getRate();
        _rOwned[account] = _rOwned[account] - (tAmount * currentRate);
        _reflectFeeAndBurn(tAmount, 0, currentRate);
    }

    function burn(uint256 amount) external {
        _burn(_msgSender(), amount);
    }

    function burnFrom(address account, uint256 amount) external {
        uint256 currentAllowance = _allowances[account][_msgSender()];
        require(currentAllowance >= amount, 'Burn amount exceeds allowance');
        _approve(account, _msgSender(), currentAllowance - amount);
        _burn(account, amount);
    }

    function increaseAllowance(address spender, uint256 addedValue) external virtual returns (bool) {
        _approve(_msgSender(), spender, _allowances[_msgSender()][spender] + addedValue);
        return true;
    }

    function decreaseAllowance(address spender, uint256 subtractedValue) external virtual returns (bool) {
        uint256 currentAllowance = _allowances[_msgSender()][spender];
        require(currentAllowance >= subtractedValue, 'Decreased allowance below zero');
        _approve(_msgSender(), spender, currentAllowance - subtractedValue);

        return true;
    }

    function reflectionFromToken(uint256 tAmount, bool deductTransferFee) external view returns (uint256) {
        require(tAmount <= _tTotal, 'Amount must be less than supply');
        uint256 currentRate = _getRate();
        if (!deductTransferFee) {
            return tAmount * currentRate;
        } else {
            (uint256 rTransferAmount, , , , ) = _getValues(tAmount, currentRate);
            return rTransferAmount;
        }
    }

    // Owner functions

    function setAccountLimit(uint256 amount) external onlyOwner {
        accountLimit = amount;
    }

    function setSingleTransferLimit(uint256 amount) external onlyOwner {
        singleTransferLimit = amount;
    }

    function setSwapCooldownDuration(uint256 duration) external onlyOwner {
        swapCooldownDuration = duration;
    }

    function includeInReward(address account) external onlyOwner {
        if (_excludedFromReward.remove(account)) {
            _tOwned[account] = 0;
            emit RewardExclusion(account, false);
        }
    }

    function excludeFromReward(address account) external onlyOwner {
        require(account != address(this), 'Cannot exclude self contract');
        if (!_excludedFromReward.contains(account)) {
            if (_rOwned[account] > 0) {
                _tOwned[account] = _tokenFromReflection(_rOwned[account]);
            }
            _excludedFromReward.add(account);
            emit RewardExclusion(account, true);
        }
    }

    function setAccountFeeExclusion(address account, bool isExcluded) external onlyOwner {
        accountsStatuses[account].feeExcluded = isExcluded;
        emit FeeExclusion(account, isExcluded);
    }

    function setAccountLimitExclusion(address account, bool isExcluded) external onlyOwner {
        accountsStatuses[account].accountLimitExcluded = isExcluded;
        emit AccountLimitExclusion(account, isExcluded);
    }

    function setTransferLimitExclusion(address account, bool isExcluded) external onlyOwner {
        accountsStatuses[account].transferLimitExcluded = isExcluded;
        emit TransferLimitExclusion(account, isExcluded);
    }

    function setBotsBlacklisting(address[] memory bots, bool isBlacklisted) external onlyOwner {
        for (uint256 i = 0; i < bots.length; i++) {
            accountsStatuses[bots[i]].blacklistedBot = isBlacklisted;
        }
    }

    function _approve(
        address owner,
        address spender,
        uint256 amount
    ) private {
        require(owner != address(0), 'Approve from the zero address');
        require(spender != address(0), 'Approve to the zero address');

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    function _balanceOf(address account) private view returns (uint256) {
        if (isExcludedFromReward(account)) return _tOwned[account];
        return _tokenFromReflection(_rOwned[account]);
    }

    function _burn(address account, uint256 tAmount) private {
        require(account != address(0), 'Burn from the zero address');
        require(_balanceOf(account) >= tAmount, 'Burn amount exceeds balance');

        uint256 currentRate = _getRate();
        _rOwned[account] = _rOwned[account] - (tAmount * currentRate);
        if (isExcludedFromReward(account)) {
            _tOwned[account] = _tOwned[account] - tAmount;
        }
        _reflectFeeAndBurn(0, tAmount, currentRate);
        emit Transfer(account, address(0), tAmount);
    }

    function _tokenFromReflection(uint256 rAmount) private view returns (uint256) {
        require(rAmount <= _rTotal, 'Amount must be less than total reflections');
        uint256 currentRate = _getRate();
        return rAmount / currentRate;
    }

    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) private {
        require(sender != address(0), 'Transfer from the zero address');
        require(recipient != address(0), 'Transfer to the zero address');
        require(amount > 0, 'Transfer amount must be greater than zero');

        _checkBotBlacklisting(sender, recipient);
        _checkTransferLimit(sender, recipient, amount);
        _checkAccountLimit(recipient, amount, _balanceOf(recipient));
        _checkSwapCooldown(sender, recipient, swapPair, address(swapRouter));

        _liquifyTokens(sender);

        _tokenTransfer(sender, recipient, amount);
    }

    function _checkBotBlacklisting(address sender, address recipient) private view {
        require(!accountsStatuses[sender].blacklistedBot, 'Sender is blacklisted');
        require(!accountsStatuses[recipient].blacklistedBot, 'Recipient is blacklisted');
    }

    function _checkTransferLimit(
        address sender,
        address recipient,
        uint256 amount
    ) private view {
        if (!accountsStatuses[sender].transferLimitExcluded && !accountsStatuses[recipient].transferLimitExcluded) {
            require(amount <= singleTransferLimit, 'Transfer amount exceeds the limit');
        }
    }

    function _checkAccountLimit(
        address recipient,
        uint256 amount,
        uint256 recipientBalance
    ) private view {
        if (!accountsStatuses[recipient].accountLimitExcluded) {
            require(recipientBalance + amount <= accountLimit, 'Recipient has reached account tokens limit');
        }
    }

    function _checkSwapCooldown(
        address sender,
        address recipient,
        address swapPair,
        address swapRouter
    ) private {
        if (swapCooldownDuration > 0 && sender == swapPair && recipient != swapRouter) {
            require(accountsStatuses[recipient].swapCooldown < block.timestamp, 'Swap is cooling down');
            accountsStatuses[recipient].swapCooldown = block.timestamp + swapCooldownDuration;
        }
    }

    function _liquifyTokens(address sender) private {
        uint256 amountToLiquify = _balanceOf(address(this));
        if (
            isLiquifyingEnabled && !_isInSwapAndLiquify() && sender != swapPair && amountToLiquify >= minAmountToLiquify
        ) {
            if (amountToLiquify > singleTransferLimit) {
                amountToLiquify = singleTransferLimit;
            }
            // approve router to transfer tokens to cover all possible scenarios
            _approve(address(this), address(swapRouter), amountToLiquify);
            _swapAndLiquify(amountToLiquify, owner());
        }
    }

    function _tokenTransfer(
        address sender,
        address recipient,
        uint256 amount
    ) private {
        bool disableFee = accountsStatuses[sender].feeExcluded || accountsStatuses[recipient].feeExcluded;

        if (isExcludedFromReward(sender) && !isExcludedFromReward(recipient)) {
            _transferFromExcluded(sender, recipient, amount, disableFee);
        } else if (!isExcludedFromReward(sender) && isExcludedFromReward(recipient)) {
            _transferToExcluded(sender, recipient, amount, disableFee);
        } else if (!isExcludedFromReward(sender) && !isExcludedFromReward(recipient)) {
            _transferStandard(sender, recipient, amount, disableFee);
        } else if (isExcludedFromReward(sender) && isExcludedFromReward(recipient)) {
            _transferBothExcluded(sender, recipient, amount, disableFee);
        } else {
            _transferStandard(sender, recipient, amount, disableFee);
        }
    }

    function _transferStandard(
        address sender,
        address recipient,
        uint256 tAmount,
        bool disableFee
    ) private {
        uint256 currentRate = _getRate();
        (uint256 rTransferAmount, uint256 tTransferAmount, uint256 tFee, uint256 tLiquidity, uint256 tBurn) =
            _getValues(tAmount, currentRate, disableFee);
        _rOwned[sender] = _rOwned[sender] - (tAmount * currentRate);
        _rOwned[recipient] = _rOwned[recipient] + rTransferAmount;
        _takeLiquidity(tLiquidity, currentRate);
        _reflectFeeAndBurn(tFee, tBurn, currentRate);
        _emitTransfers(sender, recipient, tTransferAmount, tBurn, tLiquidity);
    }

    function _transferToExcluded(
        address sender,
        address recipient,
        uint256 tAmount,
        bool disableFee
    ) private {
        uint256 currentRate = _getRate();
        (uint256 rTransferAmount, uint256 tTransferAmount, uint256 tFee, uint256 tLiquidity, uint256 tBurn) =
            _getValues(tAmount, currentRate, disableFee);
        _rOwned[sender] = _rOwned[sender] - (tAmount * currentRate);
        _tOwned[recipient] = _tOwned[recipient] + tTransferAmount;
        _rOwned[recipient] = _rOwned[recipient] + rTransferAmount;
        _takeLiquidity(tLiquidity, currentRate);
        _reflectFeeAndBurn(tFee, tBurn, currentRate);
        _emitTransfers(sender, recipient, tTransferAmount, tBurn, tLiquidity);
    }

    function _transferFromExcluded(
        address sender,
        address recipient,
        uint256 tAmount,
        bool disableFee
    ) private {
        uint256 currentRate = _getRate();
        (uint256 rTransferAmount, uint256 tTransferAmount, uint256 tFee, uint256 tLiquidity, uint256 tBurn) =
            _getValues(tAmount, currentRate, disableFee);
        _tOwned[sender] = _tOwned[sender] - tAmount;
        _rOwned[sender] = _rOwned[sender] - (tAmount * currentRate);
        _rOwned[recipient] = _rOwned[recipient] + rTransferAmount;
        _takeLiquidity(tLiquidity, currentRate);
        _reflectFeeAndBurn(tFee, tBurn, currentRate);
        _emitTransfers(sender, recipient, tTransferAmount, tBurn, tLiquidity);
    }

    function _transferBothExcluded(
        address sender,
        address recipient,
        uint256 tAmount,
        bool disableFee
    ) private {
        uint256 currentRate = _getRate();
        (uint256 rTransferAmount, uint256 tTransferAmount, uint256 tFee, uint256 tLiquidity, uint256 tBurn) =
            _getValues(tAmount, currentRate, disableFee);
        _tOwned[sender] = _tOwned[sender] - tAmount;
        _rOwned[sender] = _rOwned[sender] - (tAmount * currentRate);
        _tOwned[recipient] = _tOwned[recipient] + tTransferAmount;
        _rOwned[recipient] = _rOwned[recipient] + rTransferAmount;
        _takeLiquidity(tLiquidity, currentRate);
        _reflectFeeAndBurn(tFee, tBurn, currentRate);
        _emitTransfers(sender, recipient, tTransferAmount, tBurn, tLiquidity);
    }

    function _emitTransfers(
        address sender,
        address recipient,
        uint256 tTransferAmount,
        uint256 tBurn,
        uint256 tLiquidity
    ) private {
        emit Transfer(sender, recipient, tTransferAmount);
        if (tBurn > 0) {
            emit Transfer(sender, address(0), tBurn);
        }
        if (tLiquidity > 0) {
            emit Transfer(sender, address(this), tLiquidity);
        }
    }

    function _takeLiquidity(uint256 tLiquidity, uint256 currentRate) private {
        _rOwned[address(this)] = _rOwned[address(this)] + (tLiquidity * currentRate);
        if (isExcludedFromReward(address(this))) {
            _tOwned[address(this)] = _tOwned[address(this)] + tLiquidity;
        }
    }

    function _reflectFeeAndBurn(
        uint256 tFee,
        uint256 tBurn,
        uint256 currentRate
    ) private {
        _rTotal = _rTotal - (tFee * currentRate) - (tBurn * currentRate);
        _tBurnTotal = _tBurnTotal + tBurn;
        _tFeeTotal = _tFeeTotal + tFee;
        _tTotal = _tTotal - tBurn;
    }

    function _getValues(uint256 tAmount, uint256 currentRate)
        private
        pure
        returns (
            uint256,
            uint256,
            uint256,
            uint256,
            uint256
        )
    {
        return _getValues(tAmount, currentRate, false);
    }

    function _getValues(
        uint256 tAmount,
        uint256 currentRate,
        bool disableFee
    )
        private
        pure
        returns (
            uint256,
            uint256,
            uint256,
            uint256,
            uint256
        )
    {
        (uint256 tTransferAmount, uint256 tFee, uint256 tLiquidity, uint256 tBurn) = _getTValues(tAmount, disableFee);
        return (
            _getRTransferAmount(tAmount, tFee, tLiquidity, tBurn, currentRate),
            tTransferAmount,
            tFee,
            tLiquidity,
            tBurn
        );
    }

    function _getTValues(uint256 tAmount, bool disableFee)
        private
        pure
        returns (
            uint256,
            uint256,
            uint256,
            uint256
        )
    {
        if (disableFee) {
            return (tAmount, 0, 0, 0);
        }

        uint256 tFee = (tAmount * _tFeePercent) / 100;
        uint256 tLiquidity = (tAmount * _tLiquidityPercent) / 100;
        uint256 tBurn = (tAmount * _tBurnPercent) / 100;
        uint256 tTransferAmount = tAmount - tFee - tLiquidity - tBurn;
        return (tTransferAmount, tFee, tLiquidity, tBurn);
    }

    function _getRTransferAmount(
        uint256 tAmount,
        uint256 tFee,
        uint256 tLiquidity,
        uint256 tBurn,
        uint256 currentRate
    ) private pure returns (uint256) {
        uint256 rAmount = tAmount * currentRate;
        uint256 rFee = tFee * currentRate;
        uint256 rLiquidity = tLiquidity * currentRate;
        uint256 rBurn = tBurn * currentRate;
        return rAmount - rFee - rLiquidity - rBurn;
    }

    function _getRate() private view returns (uint256) {
        (uint256 rSupply, uint256 tSupply) = _getCurrentSupply();
        return rSupply / tSupply;
    }

    function _getCurrentSupply() private view returns (uint256, uint256) {
        uint256 rSupply = _rTotal;
        uint256 tSupply = _tTotal;
        for (uint256 i = 0; i < _excludedFromReward.length(); i++) {
            address excluded = _excludedFromReward.at(i);
            if (_rOwned[excluded] > rSupply || _tOwned[excluded] > tSupply) return (_rTotal, _tTotal);
            rSupply = rSupply - _rOwned[excluded];
            tSupply = tSupply - _tOwned[excluded];
        }
        if (rSupply < _rTotal / _tTotal) return (_rTotal, _tTotal);
        return (rSupply, tSupply);
    }
}
