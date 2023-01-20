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
const START_TIME = 1674213329;
const TRANCHE_TIME_IN_DAYS = 30;
const CLAIM_PERCENT  = 10;
const CLAIMS_CAP = 10;

async function main() {
  const Airdrop = await hre.ethers.getContractFactory("Airdrop");
  const airdrop = await Airdrop.deploy(
    NUO_ADDRESS,
    START_TIME,
    TRANCHE_TIME_IN_DAYS,
    CLAIM_PERCENT,
    CLAIMS_CAP
  );

  await airdrop.deployed();

  console.log("Airdrop contract address", airdrop.address);

  console.log(
    "Verify command :",
    "npx hardhat verify --network goerli",
    airdrop.address,
    NUO_ADDRESS,
    START_TIME,
    TRANCHE_TIME_IN_DAYS,
    CLAIM_PERCENT,
    CLAIMS_CAP
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
