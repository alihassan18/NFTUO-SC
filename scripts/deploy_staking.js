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
const NUO_ADDRESS = "0xD5257e9145daa63AA3F2b000a2Eb71098f9FBa94";
const WALLET = "0xE1043012936b8a877D37bd64839544204638d035";

async function main() {
  const Staking = await hre.ethers.getContractFactory("Staking");
  const staking = await Staking.deploy(NUO_ADDRESS, WALLET);

  await staking.deployed();

  console.log("Staking contract address", staking.address);

  console.log(
    "Verify command :",
    "npx hardhat verify --network goerli",
    staking.address,
    NUO_ADDRESS,
    WALLET
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
