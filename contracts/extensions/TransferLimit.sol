// SPDX-License-Identifier: MIT

pragma solidity ^0.8.6;

import '@openzeppelin/contracts/access/Ownable.sol';

contract TransferLimit is Ownable {
    uint256 private singleTransferLimit;

    function setSingleTransferLimit(uint256 amount) external onlyOwner() {
        _setSingleTransferLimit(amount);
    }

    function _singleTransferLimit() internal view returns (uint256) {
        return singleTransferLimit;
    }

    function _setSingleTransferLimit(uint256 amount) internal {
        singleTransferLimit = amount;
    }
}
