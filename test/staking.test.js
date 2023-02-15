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

const VAULT_0 = {
  apr: 60,
  maxCap: parseEther((1_000_000_000_000).toString()),
  cliff: 12 * 30 * 24 * 60 * 60,
};
const VAULT_1 = {
  apr: 90,
  maxCap: parseEther((500_000_000_000).toString()),
  cliff: 2 * 12 * 30 * 24 * 60 * 60,
};

const VAULT_2 = {
  apr: 120,
  maxCap: parseEther((500_000_000_000).toString()),
  cliff: 3 * 12 * 30 * 24 * 60 * 60,
};

const AMOUNT_TO_STAKE = parseEther((1_000).toString());
let STAKE_ID = 0;

const ONE_MONTH = 30 * 24 * 60 * 60;
const ONE_DAY = 24 * 60 * 60;
const ONE_YEAR = ONE_MONTH * 12 + ONE_DAY * 5;

let Vaults = [];

let Staking;
let NuoToken;

describe("Deploying Contracts", function () {
  it("Should Deploy NUO token Contract", async () => {
    [OWNER, _wallet, ZeroBalUser, ...users] = await ethers.getSigners();

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
    Staking = await STAKING.deploy(
      NuoToken.address,
      _wallet.address,
      _wallet.address
    );
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

  it("Wallet address should have been set accurately", async () => {
    let walletAddress = await Staking.getWalletAddress();
    walletAddress.should.be.equal(_wallet.address);
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

  it("Should fail to Restake", async () => {
    await Staking.connect(users[0])
      .harvestRewardTokens(1, 0)
      .should.be.rejectedWith("Pausable");
  });

  it("Should fail to Unstake", async () => {
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
    await NuoToken.transfer(_wallet.address, USERS_BAL);
    for (let i = 0; i < users.length; i++) {
      await NuoToken.transfer(users[i].address, USERS_BAL);
    }
  });

  it("Users should have accurate NUO token balance to stake", async () => {
    let walletBal = await NuoToken.balanceOf(_wallet.address);
    walletBal.should.be.equal(USERS_BAL);
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
      VAULT_0.maxCap.add(parseEther("1"))
    );
    await Staking.connect(users[1])
      .stake(VAULT_0.maxCap.add(parseEther("1")), 0)
      .should.be.rejectedWith("Stake: Max stake cap reached");
  });

  it("Stake amount reaches Max Vault cap for Vault_2", async () => {
    await NuoToken.connect(users[1]).approve(
      Staking.address,
      VAULT_1.maxCap.add(parseEther("1"))
    );
    await Staking.connect(users[1])
      .stake(VAULT_1.maxCap.add(parseEther("1")), 1)
      .should.be.rejectedWith("Stake: Max stake cap reached");
  });

  it("Stake amount reaches Max Vault cap for Vault_3", async () => {
    await NuoToken.connect(users[1]).approve(
      Staking.address,
      VAULT_2.maxCap.add(parseEther("1"))
    );
    await Staking.connect(users[1])
      .stake(VAULT_2.maxCap.add(parseEther("1")), 2)
      .should.be.rejectedWith("Stake: Max stake cap reached");
  });
});

describe("Set ERC20 allowance for test users", function () {
  it("should set allowance", async () => {
    await NuoToken.connect(_wallet).approve(Staking.address, USERS_BAL);

    for (let i = 0; i < users.length; i++) {
      await NuoToken.connect(users[i]).approve(Staking.address, USERS_BAL)
        .should.be.fulfilled;
    }
  });
  it("Validate approvals", async () => {
    let walletAllowance = await NuoToken.allowance(
      _wallet.address,
      Staking.address
    );
    walletAllowance.should.be.equal(USERS_BAL);

    for (let i = 0; i < users.length; i++) {
      let allowance = await NuoToken.allowance(
        users[i].address,
        Staking.address
      );
      allowance.should.be.equal(USERS_BAL);
    }
  });
});

describe("Stake", function () {
  describe("VAult 1", function () {
    it("Initially staked Tokens should be zero in Vault 1", async () => {
      let stakedInVault = await Staking.tokensStakedInVault(0);
      stakedInVault.should.be.equal(parseEther("0"));
    });

    it("Should Stake In Vault 1 successfully", async () => {
      for (let i = 0; i < 5; i++) {
        STAKE_ID++;
        await Staking.connect(users[i]).stake(AMOUNT_TO_STAKE, 0).should.be
          .fulfilled;
      }
    });

    it("Should have updated staked amount in Vault 1", async () => {
      let stakedInVault = await Staking.tokensStakedInVault(0);
      stakedInVault.should.be.equal(AMOUNT_TO_STAKE.mul(5));
    });

    it("Total Stakes so far", async () => {
      let totalStakes = await Staking.totalStakes();
      totalStakes.should.be.equal(STAKE_ID);
    });

    it("Should update accurate stake info", async () => {
      for (let id = 1; id <= STAKE_ID; id++) {
        let {
          walletAddress,
          stakeId,
          stakedAmount,
          totalClaimed,
          vault,
          unstaked,
        } = await Staking.getStakeInfoById(id);

        walletAddress.should.be.equal(users[id - 1].address);
        stakeId.should.be.equal(id.toString());
        stakedAmount.should.be.equal(AMOUNT_TO_STAKE);
        totalClaimed.should.be.equal(parseEther("0"));
        vault.should.be.equal(0);
        unstaked.should.be.equal(false);
      }
    });
    it("Should update Stake balance in Vault_1", async () => {
      let tokensInVault1 = await Staking.tokensStakedInVault(0);
      tokensInVault1.should.be.equal(AMOUNT_TO_STAKE.mul(5));
    });
  });

  describe("Vault 2", function () {
    it("Initially staked Tokens should be zero in Vault 2", async () => {
      let stakedInVault = await Staking.tokensStakedInVault(1);
      stakedInVault.should.be.equal(parseEther("0"));
    });

    it("Should Stake In Vault 2 successfully", async () => {
      for (let i = 5; i < 11; i++) {
        STAKE_ID++;
        await Staking.connect(users[i]).stake(AMOUNT_TO_STAKE, 1).should.be
          .fulfilled;
      }
    });

    it("Should have updated staked amount in Vault 2", async () => {
      let stakedInVault = await Staking.tokensStakedInVault(1);
      stakedInVault.should.be.equal(AMOUNT_TO_STAKE.mul(6));
    });

    it("Total Stakes so far", async () => {
      let totalStakes = await Staking.totalStakes();
      totalStakes.should.be.equal(STAKE_ID);
    });

    it("Should update accurate stake info", async () => {
      for (let id = 6; id <= STAKE_ID; id++) {
        let {
          walletAddress,
          stakeId,
          stakedAmount,
          totalClaimed,
          vault,
          unstaked,
        } = await Staking.getStakeInfoById(id);

        walletAddress.should.be.equal(users[id - 1].address);
        stakeId.should.be.equal(id.toString());
        stakedAmount.should.be.equal(AMOUNT_TO_STAKE);
        totalClaimed.should.be.equal(parseEther("0"));
        vault.should.be.equal(1);
        unstaked.should.be.equal(false);
      }
    });

    it("Should update Stake balance in Vault_2", async () => {
      let tokensInVault2 = await Staking.tokensStakedInVault(1);
      tokensInVault2.should.be.equal(AMOUNT_TO_STAKE.mul(6));
    });
  });

  describe("Vault 3", function () {
    it("Initially staked Tokens should be zero in Vault 3", async () => {
      let stakedInVault = await Staking.tokensStakedInVault(2);
      stakedInVault.should.be.equal(parseEther("0"));
    });

    it("Should Stake In Vault 3 successfully", async () => {
      for (let i = 11; i < 17; i++) {
        STAKE_ID++;
        await Staking.connect(users[i]).stake(AMOUNT_TO_STAKE, 2).should.be
          .fulfilled;
      }
    });

    it("Should have updated staked amount in Vault 3", async () => {
      let stakedInVault = await Staking.tokensStakedInVault(2);
      stakedInVault.should.be.equal(AMOUNT_TO_STAKE.mul(6));
    });

    it("Total Stakes so far", async () => {
      let totalStakes = await Staking.totalStakes();
      totalStakes.should.be.equal(STAKE_ID);
    });

    it("Should update accurate stake info", async () => {
      for (let id = 12; id <= STAKE_ID; id++) {
        let {
          walletAddress,
          stakeId,
          stakedAmount,
          totalClaimed,
          vault,
          unstaked,
        } = await Staking.getStakeInfoById(id);

        walletAddress.should.be.equal(users[id - 1].address);
        stakeId.should.be.equal(id.toString());
        stakedAmount.should.be.equal(AMOUNT_TO_STAKE);
        totalClaimed.should.be.equal(parseEther("0"));
        vault.should.be.equal(2);
        unstaked.should.be.equal(false);
      }
    });
    it("Should update Stake balance in Vault_2", async () => {
      let tokensInVault3 = await Staking.tokensStakedInVault(2);
      tokensInVault3.should.be.equal(AMOUNT_TO_STAKE.mul(6));
    });
  });

  describe("Total Stakes", function () {
    it("Should have accurate total Stakes", async () => {
      let totalStakes = await Staking.totalStakes();
      totalStakes.should.be.equal(STAKE_ID);
    });

    it("Total balance of Staking contract should be equal to of Vault_1 + Vault_2 + Vault_3", async () => {
      let stakingContractBal = await NuoToken.balanceOf(Staking.address);
      let tokensInVault1 = await Staking.tokensStakedInVault(0);
      let tokensInVault2 = await Staking.tokensStakedInVault(1);
      let tokensInVault3 = await Staking.tokensStakedInVault(2);
      stakingContractBal.should.be.equal(
        tokensInVault1.add(tokensInVault2).add(tokensInVault3)
      );
    });
  });

  describe("Should have update Stakers wallet balances as expected", function () {
    it("Should have accurate wallet balance after staking", async () => {
      for (let i = 0; i < users.length; i++) {
        let userBal = await NuoToken.balanceOf(users[i].address);
        userBal.should.be.equal(USERS_BAL.sub(AMOUNT_TO_STAKE));
      }
    });
  });
});

describe("Shouldn't Unstake when", function () {
  it("Tries to unstake before cliff", async () => {
    for (let i = 0; i < users.length; i++) {
      await Staking.connect(users[i])
        .unstake(i + 1)
        .should.be.rejectedWith("Stake: Cannot unstake before the cliff");
    }
  });
  it("Address tries to unstake someone else's staked", async () => {
    for (let i = 0; i < users.length; i++) {
      await Staking.connect(users[i])
        .unstake(i)
        .should.be.rejectedWith("Stake: Not the staker");
    }
  });
});

describe("Shouldn't Restake when", function () {
  it("Address tries to claim someone else's reward", async () => {
    for (let i = 0; i < users.length; i++) {
      await Staking.connect(users[i])
        .harvestRewardTokens(i, 0)
        .should.be.rejectedWith("Stake: Not the previous staker");
    }
  });

  it("Zero reward earned", async () => {
    for (let i = 0; i < users.length; i++) {
      await Staking.connect(users[i])
        .harvestRewardTokens(i + 1, 0)
        .should.be.rejectedWith("Stake: Insufficient rewards to stake");
    }
  });
});

describe("Shouldn't Claim when", function () {
  it("Address tries to claim someone else's reward", async () => {
    for (let i = 0; i < users.length; i++) {
      await Staking.connect(users[i])
        .claimReward(i)
        .should.be.rejectedWith("Stake: Not the staker");
    }
  });

  it("Tries to claim before the cliff", async () => {
    for (let i = 0; i < users.length; i++) {
      await Staking.connect(users[i])
        .claimReward(i + 1)
        .should.be.rejectedWith("Stake: Cannot claim reward before the cliff");
    }
  });
});

describe("After 1 year of staking", function () {
  let reward;

  it("Vault_1 users should be able to claim their rewards", async () => {
    await ethers.provider.send("evm_increaseTime", [ONE_YEAR]);
    await ethers.provider.send("evm_mine");

    reward = await Staking.getClaimableTokens(1);
    for (let i = 0; i < 5; i++) {
      await Staking.connect(users[i]).claimReward(i + 1);
    }
  });

  it("Vault_1 users should be able to unstake", async () => {
    for (let i = 0; i < 5; i++) {
      await Staking.connect(users[i]).unstake(i + 1);
    }
  });

  it("Stake info should have updated accordingly", async () => {
    for (let i = 0; i < 5; i++) {
      let {
        walletAddress,
        stakeId,
        stakedAmount,
        totalClaimed,
        vault,
        unstaked,
      } = await Staking.getStakeInfoById(i + 1);
      walletAddress.should.be.equal(users[i].address);
      stakeId.should.be.equal(i + 1);
      stakedAmount.should.be.equal(AMOUNT_TO_STAKE);
      totalClaimed.should.be.equal(reward);
      vault.should.be.equal(0);
      unstaked.should.be.equal(true);
    }
  });

  it("Should fail when someone tries to unstake, already unstaked tokens", async () => {
    for (let i = 0; i < 5; i++) {
      await Staking.connect(users[i])
        .unstake(i + 1)
        .should.be.rejectedWith("Stake: No staked Tokens in the vault");
    }
  });

  it("should fail to unstake from Vault_2", async () => {
    for (let i = 5; i < 11; i++) {
      await Staking.connect(users[i])
        .unstake(i + 1)
        .should.be.rejectedWith("Stake: Cannot unstake before the cliff");
    }
  });

  it("should fail to unstake from Vault_3", async () => {
    for (let i = 11; i < users.length; i++) {
      await Staking.connect(users[i])
        .unstake(i + 1)
        .should.be.rejectedWith("Stake: Cannot unstake before the cliff");
    }
  });

  it("Should have updated users balances accurately", async () => {
    for (let i = 0; i < 5; i++) {
      let userBal = await NuoToken.balanceOf(users[i].address);
      userBal.should.be.equal(USERS_BAL.add(reward));
    }
  });
});

describe("After 2 years of staking", function () {
  let reward;

  it("Vault_2 users should be able to claim their rewards", async () => {
    await ethers.provider.send("evm_increaseTime", [ONE_YEAR]);
    await ethers.provider.send("evm_mine");

    reward = await Staking.getClaimableTokens(6);
    for (let i = 5; i < 11; i++) {
      await Staking.connect(users[i]).claimReward(i + 1);
    }
  });

  it("Vault_2 users should be able to unstake", async () => {
    // reward = await Staking.getClaimableTokens(6);

    for (let i = 5; i < 11; i++) {
      await Staking.connect(users[i]).unstake(i + 1);
    }
  });

  it("Stake info should have updated accordingly", async () => {
    for (let i = 5; i < 11; i++) {
      let {
        walletAddress,
        stakeId,
        stakedAmount,
        totalClaimed,
        vault,
        unstaked,
      } = await Staking.getStakeInfoById(i + 1);
      walletAddress.should.be.equal(users[i].address);
      stakeId.should.be.equal(i + 1);
      stakedAmount.should.be.equal(AMOUNT_TO_STAKE);
      totalClaimed.should.be.equal(reward);
      vault.should.be.equal(1);
      unstaked.should.be.equal(true);
    }
  });

  it("Should fail when someone tries to unstake, already unstaked tokens", async () => {
    for (let i = 0; i < 11; i++) {
      await Staking.connect(users[i])
        .unstake(i + 1)
        .should.be.rejectedWith("Stake: No staked Tokens in the vault");
    }
  });

  it("should fail to unstake from Vault_3", async () => {
    for (let i = 11; i < users.length; i++) {
      await Staking.connect(users[i])
        .unstake(i + 1)
        .should.be.rejectedWith("Stake: Cannot unstake before the cliff");
    }
  });

  it("Should have updated users balances accurately", async () => {
    for (let i = 5; i < 11; i++) {
      let userBal = await NuoToken.balanceOf(users[i].address);
      userBal.should.be.equal(USERS_BAL.add(reward));
    }
  });
});

describe("After 3 years of staking", function () {
  let reward;
  it("Vault_3 users should be able to claim their rewards", async () => {
    await ethers.provider.send("evm_increaseTime", [ONE_YEAR]);
    await ethers.provider.send("evm_mine");

    reward = await Staking.getClaimableTokens(12);
    for (let i = 11; i < users.length; i++) {
      await Staking.connect(users[i]).claimReward(i + 1);
    }
  });
  it("Vault_3 users should be able to unstake with reward", async () => {
    for (let i = 11; i < users.length; i++) {
      await Staking.connect(users[i]).unstake(i + 1);
    }
  });

  it("Stake info should have updated accordingly", async () => {
    for (let i = 11; i < users.length; i++) {
      let {
        walletAddress,
        stakeId,
        stakedAmount,
        totalClaimed,
        vault,
        unstaked,
      } = await Staking.getStakeInfoById(i + 1);
      walletAddress.should.be.equal(users[i].address);
      stakeId.should.be.equal(i + 1);
      stakedAmount.should.be.equal(AMOUNT_TO_STAKE);
      totalClaimed.should.be.equal(reward);
      vault.should.be.equal(2);
      unstaked.should.be.equal(true);
    }
  });

  it("Should fail when someone tries to unstake, already unstaked tokens", async () => {
    for (let i = 0; i < users.length; i++) {
      await Staking.connect(users[i])
        .unstake(i + 1)
        .should.be.rejectedWith("Stake: No staked Tokens in the vault");
    }
  });

  it("Should have updated users balances accurately", async () => {
    for (let i = 11; i < users.length; i++) {
      let userBal = await NuoToken.balanceOf(users[i].address);
      userBal.should.be.equal(USERS_BAL.add(reward));
    }
  });
});

describe("Validate wallet balance", function () {
  it("Should have accurate balance", async () => {
    let addrBal = await NuoToken.balanceOf(_wallet.address);
    // console.log(formatEther(addrBal));
  });
});

describe("Re-claim", function () {
  it("After another 2 years - it should behave expectedly", async () => {
    await ethers.provider.send("evm_increaseTime", [ONE_YEAR * 2]);
    await ethers.provider.send("evm_mine");
  });

  it("Should be all zeros", async () => {
    for (let i = 0; i < users.length; i++) {
      let claimable = await Staking.getClaimableTokens(i + 1);
      let stakingReward = await Staking.getStakingReward(i + 1);
      // console.log("claimable", claimable);
      // console.log("stakingReward", stakingReward);
    }
  });
  it("Should fail to reclaim once all tokens are claimed", async () => {
    for (let i = 0; i < users.length; i++) {
      await Staking.connect(users[i])
        .claimReward(i + 1)
        .should.be.rejectedWith("Stake: No Claims available");
    }
  });

  it("Claimable reward should be zero", async () => {
    for (let i = 0; i < users.length; i++) {
      let claimableReward = await Staking.connect(users[i]).getStakingReward(
        i + 1
      );
      claimableReward.should.be.equal(0);
    }
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

//     // let stakingReward = await Staking.getClaimableTokens(1);

//   })

//   it("Should fetch total Claimable Amount", async () => {
//     await Staking.connect(user1).harvestRewardTokens(1)
//   })

//   it("should have stake 2", async () => {
//     console.log("=====================================================");
//     await ethers.provider.send("evm_increaseTime", [MONTHS_6]);
//     await ethers.provider.send("evm_mine");

//     let stakingReward1 = await Staking.getClaimableTokens(1);
//     let stakingReward2 = await Staking.getClaimableTokens(2);
//     console.log("staking reward 1", stakingReward1);
//     console.log("staking reward 2", stakingReward2);

//     // console.log(await Staking.getStakeInfo(user1.address, 0));
//   })
// })
