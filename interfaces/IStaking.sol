// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IStaking {
    enum Vaults {
        vault_1,
        vault_2,
        vault_3
    }

    function stake(
        address _sender,
        uint256 _amount,
        Vaults _vault
    ) external;
}
