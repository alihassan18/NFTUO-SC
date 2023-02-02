const hre = require("hardhat");
require("@nomiclabs/hardhat-waffle");
const ethers = require("ethers");

const NAME = "NUO Token";
const SYMBOL = "NUO";
const TOTAL_SUPPLY = ethers.utils.parseEther("100000000");

const TOKEN_PRICE_IN_USD = "100000000000000";
const MIN_AMOUNT = "100000000000000";
const USDC_TOKEN = "0x07865c6E87B9F70255377e024ace6630C1Eaa37F";
const WALLET = "0xE1043012936b8a877D37bd64839544204638d035";

const CHAINLINK_GOERLI_USDC_USD = "0xab5c49580294aff77670f839ea425f5b78ab3ae7";

async function main() {
  const NuoToken = await hre.ethers.getContractFactory("NuoToken");
  const nuoToken = await NuoToken.deploy(NAME, SYMBOL, TOTAL_SUPPLY);
  await nuoToken.deployed();
  console.log("NUO Token contract address:", nuoToken.address);

  const TokenSwap = await hre.ethers.getContractFactory("TokenSwap");
  const tokenSwap = await TokenSwap.deploy(
    nuoToken.address,
    TOKEN_PRICE_IN_USD,
    MIN_AMOUNT,
    USDC_TOKEN,
    WALLET
  );

  await tokenSwap.deployed();
  console.log("Token Swap contract address:", tokenSwap.address);

  console.log(
    "Verify command :",
    "npx hardhat verify --network goerli",
    nuoToken.address,
    NAME,
    SYMBOL,
    TOTAL_SUPPLY.toString()
  );
  console.log("-----------------");
  console.log(
    "Verify command :",
    "npx hardhat verify --network goerli",
    tokenSwap.address,
    nuoToken.address,
    TOKEN_PRICE_IN_USD,
    MIN_AMOUNT,
    USDC_TOKEN,
    WALLET
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
