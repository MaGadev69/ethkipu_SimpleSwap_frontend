import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

const deploySimpleSwap: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployer } = await hre.getNamedAccounts();
    const { deploy } = hre.deployments;
    await deploy("SimpleSwap", {
        from: deployer,
        args: [],
        log: true,
        autoMine: true,
    });
};

export default deploySimpleSwap;
deploySimpleSwap.tags = ["SimpleSwap"];
