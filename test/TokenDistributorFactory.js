const TokenDistributorFactory = artifacts.require('./TokenDistributorFactory');
const expectThrow = require('./helpers/expectThrow');

contract('TokenDistributorFactory', (accounts) => {
    let tokenDistributorFactory;
    const adminAccount = accounts[0];
    const account1 = accounts[1];
    const account2 = accounts[2];

    before(async () => {
        tokenDistributorFactory = await TokenDistributorFactory.deployed();
    });

    it('should admin be the owner', async () => {
        const owner = await tokenDistributorFactory.owner.call();
        assert.equal(owner, adminAccount);
    });

    it('should not allow to call registerTransfer', async () => {
        expectThrow(tokenDistributorFactory.registerTransfer(account1, account2, 10, 1, { from: account1 }));
    });
});
