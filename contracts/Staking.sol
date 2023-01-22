// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "./Vault.sol";
import "hardhat/console.sol";

contract Staking is Ownable, Pausable, Vault, ReentrancyGuard {
    using Counters for Counters.Counter;
    Counters.Counter private stakeId;

    IERC20 private Token;
    address private wallet;

    constructor(IERC20 _tokenAddress, address _wallet) {
        Token = _tokenAddress;
        wallet = _wallet;

        VAULTS[0] = VaultConfig(60, 1_000_000_000_000 ether, 365 days);
        VAULTS[1] = VaultConfig(90, 500_000_000_000 ether, 2 * 365 days);
        VAULTS[2] = VaultConfig(120, 500_000_000_000 ether, 3 * 365 days);
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function getNuoToken() public view returns (address) {
        return address(Token);
    }

    function setNuoToken(IERC20 _tokenAddr) public onlyOwner {
        Token = _tokenAddr;
    }

    function getWalletAddress() public view returns (address) {
        return wallet;
    }

    function setWalletAddress(address _wallet) public onlyOwner {
        wallet = _wallet;
    }

    // Get all Vaults [enum]
    function getVaults()
        public
        pure
        returns (
            Vaults,
            Vaults,
            Vaults
        )
    {
        return (Vaults.vault_1, Vaults.vault_2, Vaults.vault_3);
    }

    // Stake in Vault
    function stake(uint256 _amount, Vaults _vault) public whenNotPaused {
        require(
            Token.balanceOf(msg.sender) >= _amount,
            "Stake: Insufficient balance"
        );

        require(
            Token.allowance(msg.sender, address(this)) >= _amount,
            "Stake: Insufficient allowance"
        );

        require(
            (totalStakedInVault[_vault] + _amount) <=
                VAULTS[uint256(_vault)].maxCap,
            "Stake: Max stake cap reached"
        );

        stakeId.increment();

        Token.transferFrom(msg.sender, address(this), _amount);
        _stakeInVault(msg.sender, _amount, _vault, stakeId.current());

        emit Staked(
            msg.sender,
            stakeId.current(),
            _amount,
            _vault,
            block.timestamp
        );
    }

    // Staking Reward by Stake Id
    function getStakingReward(uint256 _stakeId) public view returns (uint256) {
        return _restakeableRewards(_stakeId);
    }

    // Restake rewards
    function restakeRewards(uint256 _stakeId, Vaults _vault)
        public
        whenNotPaused
        nonReentrant
    {
        StakeInfo storage _stakeInfo = stakeInfoById[_stakeId];
        require(
            _stakeInfo.walletAddress == msg.sender,
            "Stake: Not the previous staker"
        );
        require(!_stakeInfo.unstaked, "Stake: No staked Tokens in the vault");
        uint256 _amountToRestake = _restakeableRewards(_stakeId);

        require(
            (totalStakedInVault[_stakeInfo.vault] + _amountToRestake) <=
                VAULTS[uint256(_stakeInfo.vault)].maxCap,
            "Stake: Max stake cap reached"
        );

        require(_amountToRestake > 0, "Stake: Insufficient rewards to stake");
        _stakeInfo.lastClaimedAt = block.timestamp;
        _stakeInfo.totalClaimed += _amountToRestake;

        stakeId.increment();
        _stakeInVault(msg.sender, _amountToRestake, _vault, stakeId.current());

        emit Restaked(
            msg.sender,
            stakeId.current(),
            _stakeId,
            _amountToRestake,
            _vault,
            block.timestamp
        );
    }

    function unstake(uint256 _stakeId) public whenNotPaused nonReentrant {
        StakeInfo storage _stakeInfo = stakeInfoById[_stakeId];
        require(
            _stakeInfo.walletAddress == msg.sender,
            "Stake: Not the staker"
        );
        require(!_stakeInfo.unstaked, "Stake: No staked Tokens in the vault");
        VaultConfig memory vaultConfig = VAULTS[_stakeId];
        require(
            block.timestamp - _stakeInfo.stakedAt >= vaultConfig.cliffInDays,
            "Stake: Cannot unstake before the cliff"
        );

        uint256 _rewardAmount = _restakeableRewards(_stakeId);
        uint256 _amountToTransfer = _stakeInfo.stakedAmount + _rewardAmount;

        _stakeInfo.lastClaimedAt = block.timestamp;
        _stakeInfo.totalClaimed += _rewardAmount;
        _stakeInfo.unstaked = true;

        // totalStakedInVault[_stakeInfo.vault][msg.sender] -= _stakeInfo
        //     .stakedAmount;

        Token.transferFrom(wallet, msg.sender, _amountToTransfer);

        emit Unstaked(
            msg.sender,
            _stakeId,
            _stakeInfo.stakedAmount,
            _stakeInfo.totalClaimed,
            _stakeInfo.vault,
            block.timestamp
        );
    }

    function claimReward(uint256 _stakeId) public whenNotPaused nonReentrant {
        StakeInfo storage _stakeInfo = stakeInfoById[_stakeId];
        require(
            _stakeInfo.walletAddress == msg.sender,
            "Stake: Not the staker"
        );
        VaultConfig memory _vault = VAULTS[uint256(_stakeInfo.vault)];
        require(
            block.timestamp - _stakeInfo.stakedAt >= _vault.cliffInDays,
            "Stake: Cannot claim reward before the cliff"
        );
        uint256 _claimableAmount = _claimableReward(_stakeInfo, _vault);
        _stakeInfo.lastClaimedAt = block.timestamp;
        _stakeInfo.totalClaimed += _claimableAmount;

        emit Claimed(
            msg.sender,
            _stakeId,
            _claimableAmount,
            _stakeInfo.vault,
            block.timestamp
        );
    }

    function getStakeInfo(address _addr, Vaults _vault)
        public
        view
        returns (StakeInfo[] memory stakeInfos)
    {
        uint256[] memory stakeIds = stakeIdsInVault[_vault][_addr];
        stakeInfos = new StakeInfo[](stakeIds.length);

        for (uint256 i = 0; i < stakeIds.length; i++) {
            stakeInfos[i] = stakeInfoById[uint256(stakeIds[i])];
        }
    }

    function tokensStakedInVault(Vaults _vault) public view returns (uint256) {
        return totalStakedInVault[_vault];
    }

    function withdrawFunds(address _to) public onlyOwner {
        Token.transferFrom(wallet, _to, Token.balanceOf(address(this)));
    }
}
