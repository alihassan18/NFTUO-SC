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
const TOTAL_SUPPLY = 1_000_000_000_000;

const START_DATE = 1672727908;
const TRANCHE_IN_DAYS = 30;
const CLAIM_PERCENTAGE = 10;
const CLAIMS_CAP = 10;

const DAYS_30 = 30 * 24 * 60 * 60;

let Airdrop;
let NuoToken;

let addresses = [];
let amounts = [];
let vestingSum = 0;

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

  it("Should Deploy Airdrop Contract", async () => {
    const AIRDROP = await ethers.getContractFactory("Airdrop");
    Airdrop = await AIRDROP.deploy(
      NuoToken.address,
      START_DATE,
      TRANCHE_IN_DAYS,
      CLAIM_PERCENTAGE,
      CLAIMS_CAP
    );
    await Airdrop.deployed();
  });

  it("Airdrop should be deployed accurately", async () => {
    let airdropAddress = Airdrop.address;
    airdropAddress.should.not.equal(ethers.constants.AddressZero);
    // NuoToken.connect(OWNER).transfer(Airdrop.address, parseEther("100000000"));
  });
});

describe("Whitelist Addresses", function () {
  it("Non owner should not be able to whitelist", async () => {
    addresses = rest.map((r) => r.address);
    let amount = 100000;
    for (let i = 0; i < [...rest].length; i++) {
      amounts[i] = parseEther(amount.toString());
      vestingSum += amount;
      amount *= 2;
    }

    await Airdrop.connect(user1)
      .whitelistAddresses(addresses, amounts)
      .should.be.rejectedWith("Ownable");
  });

  it("Only owner should be able to Whitelist", async () => {
    await Airdrop.connect(OWNER).whitelistAddresses(addresses, amounts).should
      .be.fulfilled;
  });

  it("Cross check whitelisted address", async () => {
    for (let i = 0; i < addresses.length; i++) {
      let isWhitelisted = await Airdrop.isWhitelisted(addresses[i]);
      isWhitelisted.should.be.equal(true);
    }
  });
});

describe("Expected funds required in Contract", function () {
  it("Contract should return accurate expected required funds", async () => {
    let expectedFunds = parseFloat(
      formatEther(await Airdrop.fundsRequiredInContract())
    );
    expectedFunds.should.be.equal(vestingSum);
  });

  it("Should fund the contract with NUO tokens with expectedFunds", async () => {
    await NuoToken.connect(OWNER).transfer(
      Airdrop.address,
      parseEther(vestingSum.toString())
    ).should.be.fulfilled;
  });

  it("Airdrop contract should now have expected NUO amount for Users to Claim", async () => {
    let airdropContractBal = await NuoToken.balanceOf(Airdrop.address);
    airdropContractBal.should.be.equal(parseEther(vestingSum.toString()));
  });
});

describe("Vesting Info - Before any claims", function () {
  it("Should have accurate total Vested amount", async () => {
    for (let i = 0; i < addresses.length; i++) {
      let { totalVestedAmount } = await Airdrop.getVestInfo(addresses[i]);
      totalVestedAmount.should.be.equal(amounts[i]);
    }
  });

  it("Total claims should initially be zero", async () => {
    for (let i = 0; i < addresses.length; i++) {
      let { totalClaimed } = await Airdrop.getVestInfo(addresses[i]);
      totalClaimed.should.be.equal(parseEther("0"));
    }
  });

  it("Claims count should initially be zero", async () => {
    for (let i = 0; i < addresses.length; i++) {
      let { claimsCount } = await Airdrop.getVestInfo(addresses[i]);
      claimsCount.should.be.equal(0);
    }
  });

  it("Initially last claimed At value should be start date", async () => {
    for (let i = 0; i < addresses.length; i++) {
      let { lastClaimedAt } = await Airdrop.getVestInfo(addresses[i]);
      lastClaimedAt.should.be.equal(START_DATE);
    }
  });
});

describe("Pauseable", function () {
  it("Non-Owner shouldn't be able to Pause/Unpause the contract", async () => {
    await Airdrop.connect(user1).pause().should.be.rejectedWith("Ownable");
    await Airdrop.connect(user2).pause().should.be.rejectedWith("Ownable");

    await Airdrop.connect(user1).unpause().should.be.rejectedWith("Ownable");
    await Airdrop.connect(user2).unpause().should.be.rejectedWith("Ownable");
  });

  it("Owner should be able to Pause/Unpause the contract", async () => {
    await Airdrop.connect(OWNER).pause().should.be.fulfilled;
  });
});

describe("Before all conditions meet - claim must fail ❌", function () {
  it("Shouldn't claim when Paused", async () => {
    await Airdrop.connect(user1).claim().should.be.rejectedWith("Pausable");
  });

  it("Owner should be able to Unpause the contract", async () => {
    await Airdrop.connect(OWNER).unpause().should.be.fulfilled;
  });

  it("Shouldn't claim if non-whitelisted user tries to claim", async () => {
    await Airdrop.connect(user1).claim().should.be.rejectedWith("Airdrop");
  });

  it("Should fail to claim before completing Tranche period", async () => {
    await Airdrop.connect(rest[0]).claim().should.be.rejectedWith("Airdrop");
  });
});

describe("Time Travel 📆 and Claim Successfully ✅", function () {
  it("Before any Claim - initial balance of wallets should be 0.0", async () => {
    for (let i = 0; i < addresses.length; i++) {
      let balance = await NuoToken.balanceOf(rest[i].address);
      balance.should.be.equal(parseEther("0"));
    }
  });

  it("Should travel in time to Tranche period", async () => {
    // await ethers.provider.send("evm_increaseTime", [DAYS_30]);
  });

  it("Should claim after each 30 days for 10 times", async () => {
    for (let i = 0; i < 10; i++) {
      await ethers.provider.send("evm_increaseTime", [DAYS_30]);
      for (let j = 0; j < 10; j++) {
        await Airdrop.connect(rest[j]).claim().should.be.fulfilled;
      }
    }
  });

  it("Should claim all tokens at once, after 10 months", async () => {
    for (let i = 10; i < 14; i++) {
      await Airdrop.connect(rest[i]).claim().should.be.fulfilled;
    }
  });
});

describe("After all claims", function () {
  it("Should have accurate total Vested amount", async () => {
    for (let i = 0; i < addresses.length; i++) {
      let { totalVestedAmount } = await Airdrop.getVestInfo(addresses[i]);
      totalVestedAmount.should.be.equal(amounts[i]);
    }
  });

  it("Total claims should be equal to total Vested Amount", async () => {
    for (let i = 0; i < addresses.length; i++) {
      let { totalVestedAmount, totalClaimed } = await Airdrop.getVestInfo(
        addresses[i]
      );
      totalClaimed.should.be.equal(totalVestedAmount);
    }
  });

  it("Claims count should be equal to claims Cap", async () => {
    for (let i = 0; i < addresses.length; i++) {
      let { claimsCount } = await Airdrop.getVestInfo(addresses[i]);
      claimsCount.should.be.equal(CLAIMS_CAP);
    }
  });
});

describe("Balances after claim", function () {
  it("Wallet balances should be updated accurately", async () => {
    for (let i = 0; i < addresses.length; i++) {
      let balance = await NuoToken.balanceOf(rest[i].address);
      balance.should.be.equal(amounts[i]);
    }
  });

  it("Airdrop Contract Balance should now be zero", async () => {
    let contractBal = await NuoToken.balanceOf(Airdrop.address);
    contractBal.should.be.equal(parseEther("0"));
  });
});

describe("Expected funds-in-contract required should now be zero", function () {
  it("Should return Zero", async ()=> {
    let expectedFundsRequired = await Airdrop.fundsRequiredInContract()
    expectedFundsRequired.should.be.equal(parseEther('0'));
  })
})

// it("Should should fail before 1 month", async () => {
//   console.log(
//     "Contract bal before:",
//     formatEther(await NuoToken.balanceOf(Airdrop.address))
//   );
//   await Airdrop.connect(user1)
//     .claim()
//     .should.be.rejectedWith("No claims available");
// });

// it("should return claim calculations - after 1 month", async () => {
//   await ethers.provider.send("evm_increaseTime", [DAYS_30]);
//   await ethers.provider.send("evm_mine");

//   // console.log(await Airdrop.getVestInfo(user4.address));

//   let response = await Airdrop.connect(user1).claim();
//   // console.log(formatEther(response.totalClaimableAmount));
//   console.log(await Airdrop.getVestInfo(user1.address));
// });

// it("Should reject", async () => {
//   await ethers.provider.send("evm_mine");

//   // console.log(await Airdrop.getVestInfo(user1.address));

//   for (let i = 0; i < 9; i++) {
//     await ethers.provider.send("evm_increaseTime", [DAYS_30]);
//     let response = await Airdrop.connect(user1).claim();
//   }

//   // console.log(formatEther(response.totalClaimableAmount));
//   console.log(await Airdrop.getVestInfo(user1.address));

//   console.log(
//     "Contract bal after:",
//     formatEther(await NuoToken.balanceOf(Airdrop.address))
//   );

//   let response = await Airdrop.connect(user1)
//     .claim()
//     .should.be.rejectedWith();
// });
// });

// describe("Lastly", function () {
//   it("Should fetch required funds in airdrop contract", async () => {
//     let arr = await Airdrop.getWhitelistedAddresses();
//     console.log(arr);
//   });

//   it("Funds required in contract", async () => {
//     console.log(
//       "Expected Token Amount:",
//       formatEther(await Airdrop.expectedTokensAmount())
//     );
//     console.log(
//       "Balance of Airdrop   :",
//       formatEther(await NuoToken.balanceOf(Airdrop.address))
//     );
//     let fundsReq = await Airdrop.fundsRequiredInContract();
//     console.log(parseFloat(formatEther(fundsReq)));

//     // console.log(fundsReq);
//   });

//   it("Should check if whitelisted", async () => {
//     console.log(await Airdrop.isWhitelisted(user1.address));
//     console.log(await Airdrop.isWhitelisted(rest[0].address));
//   });
// });
