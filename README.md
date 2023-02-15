# Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a script that deploys that contract.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat run scripts/deploy.js
```
# Smart Contracts Overview:

## 1. Token Swap Smart Contract

A smart contract to swap between ERC20 tokens and USDC. The contract can be paused and resumed by the contract owner, and supports updating the token price, the minimum swap amount, and the USDC token address. The swap function takes a token name and an amount, then it sells the token for USDC or buys the token with USDC depending on the given token name.

### Requirements
The following packages are required to use the contract:
- OpenZeppelin 4.4.1
- Chainlink 0.8.0
### Usage
To use the contract, an instance of the TokenSwap contract needs to be deployed on the Ethereum network. During deployment, the following parameters should be provided:

- `_tokenAddress`: the address of the ERC20 token to swap.
- `_tokenPriceInUsd`: the current price of the token in USD.
- `_minSwapAmount`: the minimum swap amount that is allowed.
- `_usdcToken`: the address of the USDC token.

### After deployment, the contract owner can perform the following operations:

#### Pause and Unpause: 
The contract owner can pause and resume the contract by calling the `pause()` and `unpause()` functions, respectively.

#### Update Token Address
The contract owner can update the token address by calling the `updateToken()` function and passing the new token address.

#### Update Token Price
The contract owner can update the token price by calling the `updateTokenPrice()` function and passing the new token price in USD.

#### Update Minimum Swap Amount
The contract owner can update the minimum swap amount by calling the `updateMinimumSwapAmount()` function and passing the new minimum swap amount.

#### Update USDC Token Address
The contract owner can update the USDC token address by calling the `updateUsdcToken()` function and passing the new USDC token address.

#### Withdraw Tokens
The contract owner can withdraw tokens from the contract by calling the `withdrawTokens()` function and passing the amount of tokens to withdraw.

#### Swap Tokens
The `swap()` function is the main function of the contract. It takes two parameters: the name of the token to swap (**NUO** or **USDC**) and the amount of tokens to swap. If the token name is **NUO**, the function sells the tokens for **USDC**. If the token name is USDC, the function buys the tokens with **USDC**.

### Events
The contract emits the following events:

`Sold(address indexed seller, uint256 amount)`: emitted when a seller sells tokens.
`Purchased(address indexed buyer, uint256 amount)`: emitted when a buyer purchases tokens.
### License
The contract is licensed under the [MIT License](https://opensource.org/license/mit-0/).

*** 

## 2. Airdrop Contract
This contract is an implementation of an Airdrop campaign for a specific ERC20 token. The campaign is divided into tranches, where a portion of the tokens is released at specified time intervals.

### Prerequisites
The following OpenZeppelin contracts are imported and used in this contract:

- `Ownable`: Implements a modifier for restricting access to certain functions only to the contract owner.
- `Pausable`: Implements functions for pausing and resuming the contract's functionality.
- `IERC20`: Implements the ERC20 interface.
- `ReentrancyGuard`: Implements a modifier that prevents reentrancy attacks.
- `Additionally`: the contract also uses an external interface IStaking for staking functionality.

### Overview
This Airdrop contract is designed to distribute a specific ERC20 token to whitelisted addresses over a period of time. Each address can claim a percentage of their total vested amount in each tranche, and the contract also provides an option to stake the claimed tokens. The campaign is divided into tranches, and a certain percentage of tokens is released at each tranche.

### Contract Functions
#### Constructor
The constructor takes the following parameters:

- `_nuoToken`: The ERC20 token to be distributed in the airdrop.
- `_stakingContract`: The interface of the staking contract.
- `_startTime`: The timestamp when the airdrop campaign starts.
- `_trancheTimeInDays`: The duration of each tranche, in days.
- `_claimPercentage`: The percentage of the total vested amount that can be claimed at each tranche.
- `_numOfClaims`: The maximum number of claims allowed per address.
- `getTotalTokenReleased`: This function returns the total amount of tokens that have been released to all addresses.

### Functions
- `pause`: This function is used to pause the contract's functionality and can only be called by the owner.
- `unpause`: This function is used to resume the contract's functionality and can only be called by the owner.
- `getStakingContract`: This function returns the interface of the staking contract.
- `setStakingContract`: This function is used to set the address of the staking contract and can only be called by the owner.
- `whitelistAddresses`: This function is used to whitelist addresses and their corresponding vested amounts. The function takes two arrays as input: the array of addresses to be whitelisted and the array of corresponding vested amounts.
- `getWhitelistedAddresses`: This function returns an array of all whitelisted addresses.
- `isWhitelisted`: This function checks whether an address is whitelisted.
- `claim`: This function is used to claim the vested amount by an address. The address can claim a certain percentage of the total vested amount at each tranche. The function also emits a Claimed event.
- `stake`: This function is used to stake the claimed amount by an address. The function also emits a Staked event.

### Data Structures
- `VestInfo`: This is a struct that contains the following fields:
- `totalVestedAmount`: The total amount of tokens that are vested for a specific address.
- `lastClaimedAt`: The timestamp when the last tranche was claimed.
- `totalClaimed`: The total amount of tokens claimed by an address so far.
- `claimsCount`: The number of claims made by an address so far.
- `Vaults`: This is an enum that defines the vaults in the staking contract. The vaults are represented by their index in the enum.

### Events
- `Claimed`: This event is emitted when an address claims their vested amount. The event contains the following parameters:
- `Staked`: This event is emitted when an address stake their vested amount into the `Staking contract`

### License
The contract is licensed under the [MIT License](https://opensource.org/license/mit-0/).

***
