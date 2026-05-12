const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("UUPS upgrade path", function () {
  let owner;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();
  });

  it("upgrades Counter V1 to V2 and keeps storage", async function () {
    const CounterV1 = await ethers.getContractFactory("UpgradeableCounterV1");

    const proxy = await upgrades.deployProxy(
      CounterV1,
      [owner.address],
      {
        kind: "uups",
      }
    );

    await proxy.waitForDeployment();

    await proxy.increment();
    expect(await proxy.count()).to.equal(1);

    const CounterV2 = await ethers.getContractFactory("UpgradeableCounterV2");

    const upgraded = await upgrades.upgradeProxy(
      await proxy.getAddress(),
      CounterV2
    );

    expect(await upgraded.count()).to.equal(1);
    expect(await upgraded.version()).to.equal("V2");

    await upgraded.decrement();
    expect(await upgraded.count()).to.equal(0);
  });
});