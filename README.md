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

#### Pause and Unpause
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
