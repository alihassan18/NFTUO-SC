// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import "../interfaces/IStaking.sol";

contract Airdrop is Ownable, Pausable {
    enum Vaults {
        vault_1,
        vault_2,
        vault_3
    }

    struct VestInfo {
        uint256 totalVestedAmount;
        uint256 lastClaimedAt;
        uint256 totalClaimed;
        uint256 claimsCount;
    }

    IERC20 private immutable NuoToken;
    uint256 private immutable startTime;
    uint256 private immutable trancheInDays;
    uint256 private immutable claimPercentage;
    uint256 private immutable claimsCap;

    IStaking private StakingContract;
    uint256 private totalTokenReleased;
    uint256 private expectedTokensAmount;

    address[] private whitelistedAddresses;

    mapping(address => VestInfo) private vestInfoByAddress;

    event Claimed(
        address indexed walletAddress,
        uint256 amount,
        uint256 claimedAt
    );

    event Staked(
        address indexed walletAddress,
        uint256 amount,
        uint256 stakedAt,
        address stakingContract
    );

    constructor(
        IERC20 _nuoToken,
        IStaking _stakingContract,
        uint256 _startTime,
        uint256 _trancheTimeInDays,
        uint256 _claimPercentage,
        uint256 _numOfClaims
    ) {
        NuoToken = _nuoToken;
        StakingContract = _stakingContract;
        startTime = _startTime;
        trancheInDays = _trancheTimeInDays * 1 days;
        claimPercentage = _claimPercentage;
        claimsCap = _numOfClaims;
    }

    function getTotalTokenReleased() public view returns (uint256) {
        return totalTokenReleased;
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function getStakingContract() public view returns (IStaking) {
        return StakingContract;
    }

    function setStakingContract(IStaking _stakingContract) public onlyOwner {
        StakingContract = _stakingContract;
    }

    function whitelistAddresses(
        address[] memory _addresses,
        uint256[] memory _amounts
    ) public onlyOwner {
        require(
            _addresses.length == _amounts.length,
            "Airdrop: Incorrect array length"
        );

        for (uint256 i = 0; i < _addresses.length; i++) {
            require(
                _addresses[i] != address(0),
                "Airdrop: Address cannot be zero address"
            );
            vestInfoByAddress[_addresses[i]] = VestInfo(
                _amounts[i],
                startTime,
                0,
                0
            );
            whitelistedAddresses.push(_addresses[i]);
            expectedTokensAmount += _amounts[i];
        }
    }

    function getWhitelistedAddresses() public view returns (address[] memory) {
        return whitelistedAddresses;
    }

    function isWhitelisted(address _addr) public view returns (bool) {
        return (vestInfoByAddress[_addr].totalVestedAmount > 0);
    }

    function claim() public whenNotPaused {
        require(block.timestamp >= startTime, "Airdrop: Too early!");
        VestInfo memory _vestInfo = vestInfoByAddress[msg.sender];
        require(
            _vestInfo.totalVestedAmount > 0 && _vestInfo.claimsCount < 10,
            "Airdrop: No Claim(s) Available"
        );
        (
            uint256 _totalClaimableAmount,
            uint256 _mod,
            uint256 _claimsCount
        ) = _calculateClaimableAmount(_vestInfo);

        NuoToken.transfer(msg.sender, _totalClaimableAmount);

        _vestInfo.lastClaimedAt = block.timestamp - _mod;
        _vestInfo.claimsCount += _claimsCount;
        _vestInfo.totalClaimed += _totalClaimableAmount;
        vestInfoByAddress[msg.sender] = _vestInfo;
        totalTokenReleased += _totalClaimableAmount;

        emit Claimed(msg.sender, _totalClaimableAmount, block.timestamp);
    }

    function stake(IStaking.Vaults _vault) public whenNotPaused {
        require(block.timestamp >= startTime, "Airdrop: Too early!");
        VestInfo memory _vestInfo = vestInfoByAddress[msg.sender];
        require(
            _vestInfo.totalVestedAmount > 0 && _vestInfo.claimsCount < 10,
            "Airdrop: No Claim(s) Available"
        );
        (
            uint256 _totalClaimableAmount,
            uint256 _mod,
            uint256 _claimsCount
        ) = _calculateClaimableAmount(_vestInfo);

        NuoToken.transfer(address(StakingContract), _totalClaimableAmount);
        StakingContract.stake(msg.sender, _totalClaimableAmount, _vault);

        _vestInfo.lastClaimedAt = block.timestamp - _mod;
        _vestInfo.claimsCount += _claimsCount;
        _vestInfo.totalClaimed += _totalClaimableAmount;
        vestInfoByAddress[msg.sender] = _vestInfo;
        totalTokenReleased += _totalClaimableAmount;

        emit Staked(
            msg.sender,
            _totalClaimableAmount,
            block.timestamp,
            address(this)
        );
    }

    function _calculateClaimableAmount(VestInfo memory _vestInfo)
        internal
        view
        returns (
            uint256 _totalClaimableAmount,
            uint256 _mod,
            uint256 _claimsCount
        )
    {
        require(
            block.timestamp >= _vestInfo.lastClaimedAt + trancheInDays,
            "Airdrop: No claim(s) available"
        );

        _claimsCount =
            (block.timestamp - _vestInfo.lastClaimedAt) /
            trancheInDays;

        uint256 amountForSingleClaim = (_vestInfo.totalVestedAmount *
            claimPercentage) / 100;
        _totalClaimableAmount = amountForSingleClaim * _claimsCount;

        if (
            (_claimsCount + _vestInfo.claimsCount) >= claimsCap ||
            _totalClaimableAmount + _vestInfo.totalClaimed >=
            _vestInfo.totalVestedAmount
        ) {
            _totalClaimableAmount =
                _vestInfo.totalVestedAmount -
                _vestInfo.totalClaimed;
            _mod = 0;
            _claimsCount = claimsCap - _vestInfo.claimsCount;
        } else {
            _mod = (block.timestamp - _vestInfo.lastClaimedAt) % trancheInDays;
        }
    }

    function availableAmountToClaim(address _address)
        external
        view
        returns (uint256 _totalClaimableAmount)
    {
        (_totalClaimableAmount, , ) = _calculateClaimableAmount(
            vestInfoByAddress[_address]
        );
    }

    function getVestInfo(address _addr)
        public
        view
        returns (VestInfo memory vestInfo)
    {
        return vestInfoByAddress[_addr];
    }

    function fundsRequiredInContract() public view returns (int256) {
        return
            int256(expectedTokensAmount) -
            int256(totalTokenReleased) -
            int256(NuoToken.balanceOf(address(this)));
    }

    function withdrawTokens(address _address, uint256 _amount)
        public
        onlyOwner
    {
        NuoToken.transfer(_address, _amount);
    }
}
