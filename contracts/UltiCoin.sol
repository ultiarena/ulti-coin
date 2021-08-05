// SPDX-License-Identifier: MIT

pragma solidity ^0.8.6;

import './extensions/Liquify.sol';
import './extensions/SwapCooldown.sol';
import './extensions/TransferLimit.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol';
import '@openzeppelin/contracts/utils/Address.sol';
import '@openzeppelin/contracts/utils/math/Math.sol';
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

contract UltiCoin is IERC20, IERC20Metadata, Context, Ownable, Liquify, SwapCooldown, TransferLimit {
    using Address for address;
    using EnumerableSet for EnumerableSet.AddressSet;

    string private constant _name = 'ULTI Coin';
    string private constant _symbol = 'ULTI';
    uint8 private constant _decimals = 18;

    mapping(address => uint256) private _rOwned;
    mapping(address => uint256) private _tOwned;
    mapping(address => mapping(address => uint256)) private _allowances;

    mapping(address => bool) private _isExcludedFromFee;
    EnumerableSet.AddressSet private _excludedFromReward;

    uint256 private _tTotal = 250 * 1e9 * (10**uint256(_decimals));
    uint256 private _rTotal = (type(uint256).max - (type(uint256).max % _tTotal));
    uint256 private _tFeeTotal;
    uint256 private _tBurnTotal;
    uint256 private _tLiquidityTotal;

    uint256 private constant _tFeePercent = 2;
    uint256 private constant _tBurnPercent = 2;
    uint256 private constant _tLiquidityPercent = 2;

    event IncludedInFee(address indexed account);
    event ExcludedFromFee(address indexed account);
    event IncludedInReward(address indexed account);
    event ExcludedFromReward(address indexed account);

    constructor(address owner, address router) Liquify(router) {
        // Transfer ownership to given address
        transferOwnership(owner);

        // Assign whole supply to the owner
        _rOwned[owner] = _rTotal;
        emit Transfer(address(0), owner, _tTotal);

        // Exclude the owner and this contract from the fee
        _excludeFromFee(owner);
        _excludeFromFee(address(this));

        // Exclude the owner from transfer restrictions
        _setTransferLimitExclusion(owner, true);
        _setSwapCooldownExclusion(owner, true);

        // Set initial single transfer limit
        _setSingleTransferLimit(10 * 10e6 * (10**uint256(_decimals)));

        // Set minimal amount needed to liquify
        _setMinAmountToLiquify(5000 * (10**uint256(_decimals)));

        // Set swap cooldown duration
        _setSwapCooldownDuration(1 minutes);
    }

    function name() external pure override returns (string memory) {
        return _name;
    }

    function symbol() external pure override returns (string memory) {
        return _symbol;
    }

    function decimals() external pure override returns (uint8) {
        return _decimals;
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
        return _isExcludedFromFee[account];
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
        require(currentAllowance >= amount, 'ERC20: transfer amount exceeds allowance');
        _approve(sender, _msgSender(), currentAllowance - amount);

        return true;
    }

    function reflect(uint256 tAmount) external {
        address sender = _msgSender();
        require(!isExcludedFromReward(sender), 'Excluded addresses cannot call this function');
        require(_balanceOf(sender) >= tAmount, 'Reflect amount exceeds sender balance');

        uint256 currentRate = _getRate();
        _rOwned[sender] = _rOwned[sender] - (tAmount * currentRate);
        _reflectFeeAndBurn(tAmount, 0, currentRate);
    }

    function burn(uint256 amount) external {
        _burn(_msgSender(), amount);
    }

    function burnFrom(address account, uint256 amount) external {
        uint256 currentAllowance = _allowances[account][_msgSender()];
        require(currentAllowance >= amount, 'ERC20: burn amount exceeds allowance');
        _approve(account, _msgSender(), currentAllowance - amount);
        _burn(account, amount);
    }

    function increaseAllowance(address spender, uint256 addedValue) external virtual returns (bool) {
        _approve(_msgSender(), spender, _allowances[_msgSender()][spender] + addedValue);
        return true;
    }

    function decreaseAllowance(address spender, uint256 subtractedValue) external virtual returns (bool) {
        uint256 currentAllowance = _allowances[_msgSender()][spender];
        require(currentAllowance >= subtractedValue, 'ERC20: decreased allowance below zero');
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

    function tokenFromReflection(uint256 rAmount) public view returns (uint256) {
        require(rAmount <= _rTotal, 'Amount must be less than total reflections');
        uint256 currentRate = _getRate();
        return rAmount / currentRate;
    }

    // Owner functions

    function includeInReward(address account) external onlyOwner() {
        _includeInReward(account);
    }

    function includeInFee(address account) external onlyOwner() {
        _includeInFee(account);
    }

    function excludeFromReward(address account) external onlyOwner() {
        _excludeFromReward(account);
    }

    function excludeFromFee(address account) external onlyOwner() {
        _excludeFromFee(account);
    }

    // Private functions

    function _includeInReward(address account) private {
        if (_excludedFromReward.remove(account)) {
            _tOwned[account] = 0;
            emit IncludedInReward(account);
        }
    }

    function _includeInFee(address account) private {
        _isExcludedFromFee[account] = false;
        emit IncludedInFee(account);
    }

    function _excludeFromReward(address account) private {
        require(account != address(this), 'Cannot exclude self contract');
        if (!_excludedFromReward.contains(account)) {
            if (_rOwned[account] > 0) {
                _tOwned[account] = tokenFromReflection(_rOwned[account]);
            }
            _excludedFromReward.add(account);
            emit ExcludedFromReward(account);
        }
    }

    function _excludeFromFee(address account) private {
        _isExcludedFromFee[account] = true;
        emit ExcludedFromFee(account);
    }

    function _balanceOf(address account) private view returns (uint256) {
        if (isExcludedFromReward(account)) return _tOwned[account];
        return tokenFromReflection(_rOwned[account]);
    }

    function _approve(
        address owner,
        address spender,
        uint256 amount
    ) private {
        require(owner != address(0), 'ERC20: approve from the zero address');
        require(spender != address(0), 'ERC20: approve to the zero address');

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    function _burn(address account, uint256 tAmount) private {
        require(account != address(0), 'ERC20: burn from the zero address');
        require(_balanceOf(account) >= tAmount, 'ERC20: burn amount exceeds balance');

        uint256 currentRate = _getRate();
        _rOwned[account] = _rOwned[account] - (tAmount * currentRate);
        if (isExcludedFromReward(account)) {
            _tOwned[account] = _tOwned[account] - tAmount;
        }
        _reflectFeeAndBurn(0, tAmount, currentRate);
        emit Transfer(account, address(0), tAmount);
    }

    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) private {
        require(sender != address(0), 'ERC20: transfer from the zero address');
        require(recipient != address(0), 'ERC20: transfer to the zero address');
        require(amount > 0, 'ERC20: transfer amount must be greater than zero');

        _checkTransferLimit(sender, recipient, amount);

        _checkSwapCooldown(sender, recipient);

        _liquifyTokens(sender);

        _tokenTransfer(sender, recipient, amount);
    }

    function _checkTransferLimit(
        address sender,
        address recipient,
        uint256 amount
    ) private view {
        if (!isExcludedFromTransferLimit(sender) && !isExcludedFromTransferLimit(recipient)) {
            require(amount <= singleTransferLimit, 'UltiCoin: Transfer amount exceeds the limit');
        }
    }

    function _checkSwapCooldown(address sender, address recipient) private {
        if (
            swapCooldownDuration > 0 &&
            !isExcludedFromSwapCooldown(recipient) &&
            sender == swapPair &&
            recipient != address(swapRouter)
        ) {
            require(_swapCooldown(recipient) < block.timestamp, 'UltiCoin: Swap is cooling down');
            _setSwapCooldown(recipient);
        }
    }

    function _liquifyTokens(address sender) private {
        uint256 amountToLiquify = _balanceOf(address(this));
        if (
            isLiquifyingEnabled && !_isInSwapAndLiquify() && sender != swapPair && amountToLiquify >= minAmountToLiquify
        ) {
            amountToLiquify = Math.min(amountToLiquify, singleTransferLimit);
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
        bool disableFee = _isExcludedFromFee[sender] || _isExcludedFromFee[recipient];

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
