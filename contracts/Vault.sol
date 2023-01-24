// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

abstract contract Vault {
    uint256 constant NUMERATOR = 1000;
    uint256 constant ONE_YEAR = 365 days;

    enum Vaults {
        vault_1,
        vault_2,
        vault_3
    }

    struct StakeInfo {
        address walletAddress;
        uint256 stakeId;
        uint256 stakedAmount;
        uint256 lastClaimedAt;
        uint256 totalClaimed;
        uint256 stakedAt;
        Vaults vault;
        bool unstaked;
    }

    struct VaultConfig {
        uint256 apr;
        uint256 maxCap;
        uint256 cliffInDays;
    }

    VaultConfig[3] VAULTS;

    mapping(Vaults => mapping(address => uint256[])) internal stakeIdsInVault;
    mapping(Vaults => uint256) internal totalStakedInVault;
    mapping(uint256 => StakeInfo) stakeInfoById;

    event Staked(
        address indexed walletAddr,
        uint256 indexed stakeId,
        uint256 amount,
        Vaults indexed vault,
        uint256 timestamp
    );

    event Restaked(
        address indexed walletAddr,
        uint256 indexed stakeId,
        uint256 previousStakeId,
        uint256 amount,
        Vaults indexed vault,
        uint256 timestamp
    );

    event Unstaked(
        address indexed walletAddr,
        uint256 indexed stakeId,
        uint256 stakedAmount,
        uint256 totalRewardsClaimed,
        Vaults indexed vault,
        uint256 timestamp
    );

    event Claimed(
        address indexed walletAddr,
        uint256 indexed stakeId,
        uint256 claimedAmount,
        Vaults indexed vault,
        uint256 timestamp
    );

    function _stakeInVault(
        address _address,
        uint256 _amount,
        Vaults _vault,
        uint256 _currentStakeId
    ) internal {
        stakeIdsInVault[_vault][_address].push(_currentStakeId);
        stakeInfoById[_currentStakeId] = StakeInfo(
            _address,
            _currentStakeId,
            _amount,
            block.timestamp,
            0,
            block.timestamp,
            _vault,
            false
        );

        totalStakedInVault[_vault] += _amount;
    }

    function _restakeableRewards(uint256 _stakeId)
        internal
        view
        returns (uint256 rewardAmount)
    {
        StakeInfo memory stakeInfo = stakeInfoById[_stakeId];
        VaultConfig memory vault = VAULTS[uint256(stakeInfo.vault)];
        uint256 totalTime = ((block.timestamp - stakeInfo.lastClaimedAt) *
            NUMERATOR) / ONE_YEAR;

        uint256 rewardPercentage = totalTime * vault.apr;
        rewardAmount =
            (stakeInfo.stakedAmount * rewardPercentage) /
            (100 * NUMERATOR);
    }

    function _claimableReward(
        StakeInfo memory _stakeInfo,
        VaultConfig memory _vault
    ) internal view returns (uint256 claimableAmount, uint256 numOfYears) {
        uint256 oneYearReward = (_stakeInfo.stakedAmount * _vault.apr) / 100;
        numOfYears = (block.timestamp - _stakeInfo.lastClaimedAt) / ONE_YEAR;
        uint256 _reward = oneYearReward * numOfYears;
        claimableAmount = _reward - _stakeInfo.totalClaimed;
    }
}
