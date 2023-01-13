// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TokenSwap is Ownable, Pausable {
    address Goerli_USDC_USD =
        address(0xAb5c49580294Aff77670F839ea425f5b78ab3Ae7);
    IERC20 public UsdcToken;
    IERC20 public NuoToken;
    uint256 public tokenPriceInUsd;
    uint256 public swapFee;
    uint256 public minSwapAmount;

    event Sold(address indexed seller, uint256 amount);
    event Purchased(address indexed buyer, uint256 amount);

    constructor(
        IERC20 _tokenAddress,
        uint256 _tokenPriceInUsd,
        uint256 _swapFee,
        uint256 _minSwapAmount,
        IERC20 _usdcToken
    ) {
        require(_minSwapAmount > 0, "Swap: Minimum swap amount cannot be zero");
        require(
            (address(_tokenAddress) != address(0)) &&
                (address(_usdcToken) != address(0)),
            "Swap: Address cannot be 0x0"
        );
        NuoToken = _tokenAddress;
        tokenPriceInUsd = _tokenPriceInUsd;
        swapFee = _swapFee;
        minSwapAmount = _minSwapAmount;
        UsdcToken = _usdcToken;
    }

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

    function updateToken(IERC20 _tokenAddress) public onlyOwner {
        require(
            address(_tokenAddress) != address(0),
            "Swap: Token cannot be 0x0"
        );
        NuoToken = _tokenAddress;
    }

    function updateTokenPrice(uint256 _tokenPriceInUsd) public onlyOwner {
        tokenPriceInUsd = _tokenPriceInUsd;
    }

    function updateSwapFee(uint256 _swapFee) public onlyOwner {
        swapFee = _swapFee;
    }

    function updateMinimumSwapAmount(uint256 _minSwapAmount) public onlyOwner {
        require(_minSwapAmount > 0, "Swap: Minimum swap amount cannot be zero");
        minSwapAmount = _minSwapAmount;
    }

    function updateUsdcToken(IERC20 _usdcTokenAddress) public onlyOwner {
        require(
            address(_usdcTokenAddress) != address(0),
            "Swap: Token cannot be 0x0"
        );
        UsdcToken = _usdcTokenAddress;
    }

    function swap(string memory _tokenName, uint256 _tokenAmount)
        public
        whenNotPaused
    {
        require(
            keccak256(abi.encodePacked(_tokenName)) ==
                keccak256(abi.encodePacked("NUO")) ||
                keccak256(abi.encodePacked(_tokenName)) ==
                keccak256(abi.encodePacked("USDC")),
            "Swap: Invalid token name"
        );
        keccak256(abi.encodePacked(_tokenName)) ==
            keccak256(abi.encodePacked("NUO"))
            ? _sell(_tokenAmount)
            : _buy(_tokenAmount);
    }

    function _sell(uint256 _tokenAmount) internal {
        require(_tokenAmount >= minSwapAmount, "Swap: Too low value for Swap");
        require(
            NuoToken.balanceOf(msg.sender) >= _tokenAmount,
            "Swap: Insufficient token balance"
        );

        NuoToken.transferFrom(msg.sender, address(this), _tokenAmount);
        uint256 _usdcAmount = tokensIntoUsdc(_tokenAmount);
        UsdcToken.transfer(msg.sender, _usdcAmount);

        emit Sold(msg.sender, _tokenAmount);
    }

    function _buy(uint256 _usdcAmount) internal {
        require(
            UsdcToken.balanceOf(msg.sender) >= (_usdcAmount),
            "Swap: Insufficient token balance"
        );
        UsdcToken.transferFrom(msg.sender, address(this), _usdcAmount);
        uint256 _tokenAmount = usdcIntoTokens((_usdcAmount * 10**12));
        NuoToken.transfer(msg.sender, _tokenAmount);

        emit Purchased(msg.sender, _usdcAmount);
    }

    function tokensIntoUsdc(uint256 _tokenAmount)
        public
        view
        returns (uint256)
    {
        uint256 priceInUsdc = ((_tokenAmount * tokenPriceInUsd) /
            _getUsdcToUsdPrice());
        return priceInUsdc / 10**12;
    }

    function usdcIntoTokens(uint256 _usdcAmount) public view returns (uint256) {
        uint256 priceInNuo = ((_usdcAmount * _getUsdcToUsdPrice()) /
            tokenPriceInUsd);
        return priceInNuo;
    }

    function _getUsdcToUsdPrice() internal view returns (uint256) {
        AggregatorV3Interface priceFeed = AggregatorV3Interface(
            address(Goerli_USDC_USD)
        );
        (, int256 price, , , ) = priceFeed.latestRoundData();
        return (uint256(price) * 10**(18 - priceFeed.decimals()));
    }

    function withdrawTokens(uint256 _amount) public onlyOwner {
        uint256 balance = NuoToken.balanceOf(address(this));
        require(balance >= _amount, "Swap: Not enough balance");
        NuoToken.transfer(msg.sender, balance);
    }

    function withdrawUsdc(uint256 _amount) public onlyOwner {
        uint256 balance = UsdcToken.balanceOf(address(this));
        require(balance >= _amount, "Swap: Not enough balance");
        UsdcToken.transfer(msg.sender, balance);
    }

    function emergencyWithdraw(address _address) public onlyOwner {
        uint256 balanceNuo = NuoToken.balanceOf(address(this));
        NuoToken.transfer(_address, balanceNuo);

        uint256 balanceUsdc = UsdcToken.balanceOf(address(this));
        UsdcToken.transfer(_address, balanceUsdc);
    }
}
