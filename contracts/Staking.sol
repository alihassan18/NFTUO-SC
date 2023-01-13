// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract Staking is Ownable, Pausable {
    using Counters for Counters.Counter;

    Counters.Counter private stakeId;

    struct StakeInfo {
        address wallet;
        uint256 stakedAmount;
        uint256 lastClaimedAt;
        uint256 totalClaimed;
        uint256 stakedAt;
    }

    IERC20 private Token;
    uint256 private minStakingDays;
    uint256 private minStakingAmount;
    uint256 private rewardPercentage;
    uint256 private numerator;

    constructor(
        IERC20 _tokenAddress,
        uint256 _minStakingDays,
        uint256 _minStakingAmount,
        uint256 _rewardPercentage,
        uint256 _numerator
    ) {
        Token = _tokenAddress;
        minStakingDays = _minStakingDays * 1 days;
        minStakingAmount = _minStakingAmount;
        rewardPercentage = _rewardPercentage;
        numerator = _numerator;
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function getMinStakingPeriod() public view returns (uint256) {
        return minStakingDays;
    }

    function setMinStakingPeriod(uint256 _minStakingDays) public onlyOwner {
        minStakingDays = _minStakingDays * 1 days;
    }

    function getMinStakingAmount() public view returns (uint256) {
        return minStakingAmount;
    }

    function setMinStakingAmount(uint256 _minStakingAmount) public onlyOwner {
        minStakingAmount = _minStakingAmount;
    }

    function getRewardPercentage() public view returns (uint256) {
        return rewardPercentage;
    }

    function setRewardPercentage(uint256 _rewardPercentage) public onlyOwner {
        rewardPercentage = _rewardPercentage;
    }

    function getNumerator() public view returns (uint256) {
        return numerator;
    }

    function setNumerator(uint256 _numerator) public onlyOwner {
        numerator = _numerator;
    }

    function stake(uint256 _amount) public view {
        require(_amount >= minStakingAmount, "Staking: Too low to Stake");
        require(
            Token.allowance(msg.sender, address(this)) >= _amount,
            "Staking: Insufficient Token Allowance"
        );
    }

    function unstake() public {}

    function claimReward() public {}
}
