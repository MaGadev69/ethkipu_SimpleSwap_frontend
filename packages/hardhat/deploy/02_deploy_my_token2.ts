import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { Contract } from "ethers";

const deployMyToken2: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployer } = await hre.getNamedAccounts();
    const { deploy } = hre.deployments;
    await deploy("MyToken2", {
        from: deployer,
        args: [1000],
        log: true,
        autoMine: true,
    });
};

export default deployMyToken2;
deployMyToken2.tags = ["MyToken2"];
