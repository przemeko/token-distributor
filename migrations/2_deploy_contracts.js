const DemoToken = artifacts.require('./DemoToken');
const TokenDistributorFactory = artifacts.require('./TokenDistributorFactory');

async function deploy(deployer, network, accounts) {
    let demoTokenAddress = '0xfa19d4e302336d61b895ea3b26bf4864bdd1d8ab';
    if (network !== 'rinkeby') {
        await deployer.deploy(DemoToken);
        demoTokenAddress = DemoToken.address;
    }

    await deployer.deploy(
        TokenDistributorFactory,
        demoTokenAddress
    );
}

module.exports = (deployer, network, accounts) => {
    deployer.then(async () => {
            await deploy(deployer, network, accounts);
        }
    );
};
