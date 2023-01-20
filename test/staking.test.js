const { expect, assert } = require("chai");
const {
  ethers: {
    utils: { parseEther, formatEther },
  },
  waffle,
  ethers,
} = require("hardhat");
const web3 = require("web3");
const {
  BNToFloat,
  to18Decimals,
  stringToFloat,
} = require("../utils/conversions");
const provider = waffle.provider;

const BN = web3.utils.BN;

require("chai")
  .use(require("chai-as-promised"))
  .use(require("chai-bn")(BN))
  .should();

const NAME = "NUO Token";
const SYMBOL = "NUO";
const TOTAL_SUPPLY = 100_000_000_000_000;

const DAYS_30 = 6 * 30 * 24 * 60 * 60;

let Staking;
let NuoToken;

describe("Deploying Contracts", function () {
  it("Should Deploy NUO token Contract", async () => {
    [OWNER, user1, user2, user3, user4, user5, ...rest] =
      await ethers.getSigners();

    const NUO_TOKEN = await ethers.getContractFactory("NuoToken");
    NuoToken = await NUO_TOKEN.deploy(
      NAME,
      SYMBOL,
      parseEther(TOTAL_SUPPLY.toString())
    );
    await NuoToken.deployed();
  });

  it("NUO token should be deployed successfully", async () => {
    let nuoAddress = NuoToken.address;
    nuoAddress.should.not.equal(ethers.constants.AddressZero);
  });

  it("Parameter should have been set accurately", async () => {
    let tokenName = await NuoToken.name();
    let tokenSymbol = await NuoToken.symbol();
    let tokenTotalSupply = await NuoToken.totalSupply();

    tokenName.should.be.equal(NAME);
    tokenSymbol.should.be.equal(SYMBOL);
    tokenTotalSupply.should.be.equal(parseEther(TOTAL_SUPPLY.toString()));
  });

  it("Owner should be holding all supply", async () => {
    let ownerBal = await NuoToken.balanceOf(OWNER.address);
    ownerBal.should.be.equal(parseEther(TOTAL_SUPPLY.toString()));
  });

  it("Should Deploy Staking Contract", async () => {
    const STAKING = await ethers.getContractFactory("Staking");
    Staking = await STAKING.deploy(NuoToken.address);
    await Staking.deployed();
  });

  it("Staking should be deployed accurately", async () => {
    let stakingAddress = Staking.address;
    stakingAddress.should.not.equal(ethers.constants.AddressZero);
    NuoToken.connect(OWNER).transfer(user1.address, parseEther("100000000"))
      .should.be.fulfilled;
  });
});

describe("Get Vaults", function () {
  it("Should fetch Vaults", async () => {
    let vaults = await Staking.getVaults();
    // console.log(vaults);
  });
});

describe("Stake", function () {
  it("Should set allowance", async () => {
    NuoToken.connect(user1).approve(
      Staking.address,
      parseEther(TOTAL_SUPPLY.toString())
    ).should.be.fulfilled;
  });
  it("Should Stake", async () => {
    await Staking.connect(user1).stake(parseEther("101"), 0);
    // console.log(
    //   "Staking Contract Balance:",
    //   formatEther(await NuoToken.balanceOf(Staking.address))
    // );
  });
});

describe("fetch Stakes", function () {
  it("Should fetch all stakes", async () => {
    let response = await Staking.getStakeInfo(user1.address, 0);

    // console.log(
    //   "Balance In Vault:",
    //   await Staking.getBalanceInVault(user1.address, 0)
    // );
  });
});

describe("Staking reward", function () {
  it("Should time travel", async () => {
    await ethers.provider.send("evm_increaseTime", [DAYS_30]);
    await ethers.provider.send("evm_mine");
  })
  it("Should get expected results", async () => {

    // let stakingReward = await Staking.getStakingReward(1);

  })

  it("Should fetch total Claimable Amount", async () => {
    await Staking.connect(user1).restakeRewards(1)
  })
  
  it("should have stake 2", async () => {
    console.log("=====================================================");
    await ethers.provider.send("evm_increaseTime", [DAYS_30]);
    await ethers.provider.send("evm_mine");

    let stakingReward1 = await Staking.getStakingReward(1);
    let stakingReward2 = await Staking.getStakingReward(2);
    console.log("staking reward 1", stakingReward1);
    console.log("staking reward 2", stakingReward2);

    // console.log(await Staking.getStakeInfo(user1.address, 0));
  })
})
