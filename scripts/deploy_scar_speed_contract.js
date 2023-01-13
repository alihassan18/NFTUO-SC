// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");
require("@nomiclabs/hardhat-waffle");
const ethers = require("ethers");

ethers.utils.format;
const NAME = "Scar Speed NFT";
const SYMBOL = "SCAR";
const BASE_URI = "http://localhost:5000";
const DISCOUNTED_PRICE = ethers.utils.parseEther("0.25");
const MINT_PRICE = ethers.utils.parseEther("0.75");
const WHITELISTED_MINT_LIMIT = 50;
const MAX_SUPPLY = 250;
const ROYALTY_NUMERATOR = 100;

async function main() {
  const ScarSpeedNft = await hre.ethers.getContractFactory("ScarSpeedNft");
  const scarSpeedNft = await ScarSpeedNft.deploy(
    NAME,
    SYMBOL,
    BASE_URI,
    DISCOUNTED_PRICE,
    MINT_PRICE,
    WHITELISTED_MINT_LIMIT,
    MAX_SUPPLY,
    ROYALTY_NUMERATOR
  );

  await scarSpeedNft.deployed();

  console.log("Scar Speed NFT contract address", scarSpeedNft.address);

  console.log(
    "Verify command :",
    "npx hardhat verify --network goerli",
    scarSpeedNft.address,
    NAME,
    SYMBOL,
    BASE_URI,
    DISCOUNTED_PRICE,
    MINT_PRICE,
    WHITELISTED_MINT_LIMIT,
    MAX_SUPPLY,
    ROYALTY_NUMERATOR
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
