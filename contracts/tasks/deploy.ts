import { task } from "hardhat/config";
import { writeFile } from "node:fs/promises";

task("deploy", "Deploy contracts and verify")
  .addOptionalParam("output", "write the details of the deployment to this file if this is set")
  .setAction(async ({ output }, { ethers, upgrades }) => {
    const HypercertMinter = await ethers.getContractFactory("HypercertMinter");
    const hypercertMinter = await upgrades.deployProxy(HypercertMinter, {
      kind: "uups",
      unsafeAllow: ["constructor"],
    });
    const contract = await hypercertMinter.deployed();
    console.log(`HypercertMinter is deployed to proxy address: ${hypercertMinter.address}`);

    // If the `deploymentFile` option is set then write the deployed address to
    // a json object on disk. This is intended to be deliberate with how we
    // output the contract address and other contract information.
    if (output) {
      const txReceipt = await contract.provider.getTransactionReceipt(hypercertMinter.deployTransaction.hash);
      await writeFile(
        output,
        JSON.stringify({
          address: hypercertMinter.address,
          blockNumber: txReceipt.blockNumber,
        }),
        "utf-8",
      );
    }

    if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
      try {
        const code = await hypercertMinter.instance?.provider.getCode(hypercertMinter.address);
        if (code === "0x") {
          console.log(`${hypercertMinter.name} contract deployment has not completed. waiting to verify...`);
          await hypercertMinter.instance?.deployed();
        }
        await hre.run("verify:verify", {
          address: hypercertMinter.address,
        });
      } catch ({ message }) {
        if ((message as string).includes("Reason: Already Verified")) {
          console.log("Reason: Already Verified");
        }
        console.error(message);
      }
    }
  });
