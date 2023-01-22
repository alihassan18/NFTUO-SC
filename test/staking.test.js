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
const TOTAL_SUPPLY = parseEther((300_000_000_000_000).toString());
const USERS_BAL = parseEther((1_000_000_000_010).toString());

const VAULT_0_CAP = parseEther((1_000_000_000_000).toString());
const VAULT_1_CAP = parseEther((500_000_000_000).toString());
const VAULT_2_CAP = parseEther((500_000_000_000).toString());

const MONTHS_6 = 6 * 30 * 24 * 60 * 60;
let Vaults = [];

let Staking;
let NuoToken;

describe("Deploying Contracts", function () {
  it("Should Deploy NUO token Contract", async () => {
    [OWNER, ZeroBalUser, ...users] = await ethers.getSigners();

    const NUO_TOKEN = await ethers.getContractFactory("NuoToken");
    NuoToken = await NUO_TOKEN.deploy(NAME, SYMBOL, TOTAL_SUPPLY);
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
    tokenTotalSupply.should.be.equal(TOTAL_SUPPLY);
  });

  it("Owner should be holding all supply", async () => {
    let ownerBal = await NuoToken.balanceOf(OWNER.address);
    ownerBal.should.be.equal(TOTAL_SUPPLY);
  });

  it("Should Deploy Staking Contract", async () => {
    const STAKING = await ethers.getContractFactory("Staking");
    Staking = await STAKING.deploy(NuoToken.address);
    await Staking.deployed();
  });

  it("Staking should be deployed accurately", async () => {
    let stakingAddress = Staking.address;
    stakingAddress.should.not.equal(ethers.constants.AddressZero);
    // NuoToken.connect(OWNER).transfer(user1.address, parseEther("100000000"))
    //   .should.be.fulfilled;
  });

  it("NUO contract should have been set accurately", async () => {
    let nuoToken = await Staking.getNuoToken();
    nuoToken.should.be.equal(NuoToken.address);
  });

  it("Deployer should be the owner", async () => {
    let ownerAddr = await Staking.owner();
    ownerAddr.should.be.equal(OWNER.address);

    ownerAddr = await NuoToken.owner();
    ownerAddr.should.be.equal(OWNER.address);
  });
});

describe("Vaults", function () {
  it("Should fetch Vaults", async () => {
    let vaults = await Staking.getVaults();
    Vaults = vaults;
    console.log("vaults", vaults);
  });
});

describe("Pauseable", function () {
  it("Should be unpaused initially", async () => {
    let isPaused = await Staking.paused();
    isPaused.should.be.equal(false);
  });

  it("Should fail if non-owner pause/unpause", async () => {
    await Staking.connect(users[0]).pause().should.be.rejectedWith("Ownable");
    await Staking.connect(users[1]).unpause().should.be.rejectedWith("Ownable");
  });

  it("Owner should be able to pause and unpause", async () => {
    await Staking.pause().should.be.fulfilled;
    await Staking.unpause().should.be.fulfilled;
  });

  it("Should pause the staking contract", async () => {
    await Staking.pause().should.be.fulfilled;
    let isPaused = await Staking.paused();
    isPaused.should.be.equal(true);
  });
});

describe("Staking, re-staking and claiming should fail if Paused", function () {
  it("Should fail to Stake", async () => {
    await Staking.connect(users[0])
      .stake(USERS_BAL, 0)
      .should.be.rejectedWith("Pausable");
  });

  it("Should fail to Stake", async () => {
    await Staking.connect(users[0])
      .restakeRewards(1, 0)
      .should.be.rejectedWith("Pausable");
  });

  it("Should fail to Stake", async () => {
    await Staking.connect(users[0])
      .unstake(1)
      .should.be.rejectedWith("Pausable");
  });

  it("Should unpause", async () => {
    await Staking.unpause().should.be.fulfilled;
    let isPaused = await Staking.paused();
    isPaused.should.be.equal(false);
  });
});

describe("Distribute NUO token for test accounts and update balances", function () {
  it("Should transfer tokens to all test accounts", async () => {
    for (let i = 0; i < users.length; i++) {
      await NuoToken.transfer(users[i].address, USERS_BAL);
    }
  });

  it("Users should have accurate NUO token balance to stake", async () => {
    for (let i = 0; i < users.length; i++) {
      let userBal = await NuoToken.balanceOf(users[i].address);
      userBal.should.be.equal(USERS_BAL);
    }
  });
});

describe("Shouldn't let stake when:", function () {
  it("Token balance is less than intended tokens to stake", async () => {
    await Staking.connect(ZeroBalUser)
      .stake(USERS_BAL, 0)
      .should.be.rejectedWith("Stake: Insufficient balance");
  });

  it("Token approval is less than the intended tokens to stake", async () => {
    await Staking.connect(users[0])
      .stake(USERS_BAL, 0)
      .should.be.rejectedWith("Stake: Insufficient allowance");
  });

  it("Stake amount reaches Max Vault cap for Vault_1", async () => {
    await NuoToken.connect(users[1]).approve(
      Staking.address,
      VAULT_0_CAP.add(parseEther("1"))
    );
    await Staking.connect(users[1])
      .stake(VAULT_0_CAP.add(parseEther("1")), 0)
      .should.be.rejectedWith("Stake: Max stake cap reached");
  });

  it("Stake amount reaches Max Vault cap for Vault_2", async () => {
    await NuoToken.connect(users[1]).approve(
      Staking.address,
      VAULT_1_CAP.add(parseEther("1"))
    );
    await Staking.connect(users[1])
      .stake(VAULT_1_CAP.add(parseEther("1")), 1)
      .should.be.rejectedWith("Stake: Max stake cap reached");
  });

  it("Stake amount reaches Max Vault cap for Vault_3", async () => {
    await NuoToken.connect(users[1]).approve(
      Staking.address,
      VAULT_2_CAP.add(parseEther("1"))
    );
    await Staking.connect(users[1])
      .stake(VAULT_2_CAP.add(parseEther("1")), 2)
      .should.be.rejectedWith("Stake: Max stake cap reached");
  });
});

// describe("Stake", function () {
//   it("Should set allowance", async () => {
//     NuoToken.connect(user1).approve(
//       Staking.address,
//       parseEther(TOTAL_SUPPLY.toString())
//     ).should.be.fulfilled;
//   });
//   it("Should Stake", async () => {
//     await Staking.connect(user1).stake(parseEther("101"), 0);
//     // console.log(
//     //   "Staking Contract Balance:",
//     //   formatEther(await NuoToken.balanceOf(Staking.address))
//     // );
//   });
// });

// describe("fetch Stakes", function () {
//   it("Should fetch all stakes", async () => {
//     let response = await Staking.getStakeInfo(user1.address, 0);

//     // console.log(
//     //   "Balance In Vault:",
//     //   await Staking.getBalanceInVault(user1.address, 0)
//     // );
//   });
// });

// describe("Staking reward", function () {
//   it("Should time travel", async () => {
//     await ethers.provider.send("evm_increaseTime", [MONTHS_6]);
//     await ethers.provider.send("evm_mine");
//   })
//   it("Should get expected results", async () => {

//     // let stakingReward = await Staking.getStakingReward(1);

//   })

//   it("Should fetch total Claimable Amount", async () => {
//     await Staking.connect(user1).restakeRewards(1)
//   })

//   it("should have stake 2", async () => {
//     console.log("=====================================================");
//     await ethers.provider.send("evm_increaseTime", [MONTHS_6]);
//     await ethers.provider.send("evm_mine");

//     let stakingReward1 = await Staking.getStakingReward(1);
//     let stakingReward2 = await Staking.getStakingReward(2);
//     console.log("staking reward 1", stakingReward1);
//     console.log("staking reward 2", stakingReward2);

//     // console.log(await Staking.getStakeInfo(user1.address, 0));
//   })
// })
