const TokenDistributorFactory = artifacts.require('./TokenDistributorFactory');

contract('TokenDistributorFactory', (accounts) => {
    let tokenDistributorFactory;
    const adminAccount = accounts[0];
    const account1 = accounts[1];
    const account2 = accounts[2];

    before(async () => {
        tokenDistributorFactory = await TokenDistributorFactory.deployed();
    });

    it('estimage gas', async () => {
        const gas = await tokenDistributorFactory.create.estimateGas("0x07f486c4ec2ade092abfe3261d0fc891e737e689", 100, 1535457217, 300);
        console.log(gas);
    });

});
