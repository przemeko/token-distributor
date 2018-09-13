const TokenDistributorFactory = artifacts.require('./TokenDistributorFactory');
const TokenDistributor = artifacts.require('./TokenDistributor');
const Token = artifacts.require('./DemoToken');

const expectThrow = require('./helpers/expectThrow');

contract('TokenDistributor', (accounts) => {
    let tokenDistributorFactory, token;
    const adminAccount = accounts[0];
    const account1 = accounts[1];
    const account2 = accounts[2];
    const PHASES_NUM = 8;

    before(async () => {
        tokenDistributorFactory = await TokenDistributorFactory.deployed();
        token = await Token.deployed();
    });

    const createTokenDistributor = async function (account, tokensInitAmount, phaseInitDate, phaseInterval) {
        const tx = await tokenDistributorFactory.create(account, tokensInitAmount, phaseInitDate, phaseInterval);
        const tokenDistributorAddress = tx.logs[0].args.newContractAddress;

        return TokenDistributor.at(tokenDistributorAddress);
    }

    const getCurrentEpochTime = function () {
        return Math.round(new Date().getTime() / 1000);
    }

    const testAvailableTokensForPhase = async function (phaseNumber, initTokensAmount, expectedTokensAmountInPhase) {
        const safeRange = 60 * 60;
        const index = phaseNumber - 1;
        const phaseInitDate = getCurrentEpochTime() - 60 * 60 * 24 * index - safeRange;
        const phaseInterval = 60 * 60 * 24;
        const tokenDistributor = await createTokenDistributor(account1, initTokensAmount, phaseInitDate, phaseInterval);

        await token.transfer(tokenDistributor.address, initTokensAmount);

        const currentPhaseNumber = await tokenDistributor.getCurrentPhaseNumber();
        assert.equal(phaseNumber, currentPhaseNumber.toString(), "Current phase");

        const tokensAvailableForCurrentPhase = await tokenDistributor.tokensAvailableForCurrentPhase();
        assert.equal(expectedTokensAmountInPhase, tokensAvailableForCurrentPhase.toString(), "Tokensa available for current phase");
    }

    const testTokensTransferForPhase = async function (phaseNumber, initTokensAmount, expectedAmountOfTransferedTokens) {
        const safeRange = 60 * 60;
        const index = phaseNumber - 1;
        const phaseInitDate = getCurrentEpochTime() - 60 * 60 * 24 * index - safeRange;
        const phaseInterval = 60 * 60 * 24;
        const tokenDistributor = await createTokenDistributor(account1, initTokensAmount, phaseInitDate, phaseInterval);

        await token.transfer(tokenDistributor.address, initTokensAmount);
        const account2BalanceBeforeTransfer = await token.balanceOf(account2);
        await tokenDistributor.transfer(account2, { from: account1 });
        const account2BalanceAfterTransfer = await token.balanceOf(account2);
        const account2Transfer = account2BalanceAfterTransfer.toNumber() - account2BalanceBeforeTransfer.toNumber();

        assert.equal(expectedAmountOfTransferedTokens, account2Transfer, "Expected amount of transfered tokens");

        return tokenDistributor;
    }

    const testTransferedParam = async function(tokenDistributor, expectedTransferedValuesArray) {
        for (i = 1; i <= PHASES_NUM; i++) {
            phase = await tokenDistributor.getPhaseByNumber(i);
            assert.equal(expectedTransferedValuesArray[i], phase[3], "Transfered value for phase number: " + i);
        }
    }

    it('should create TokenDistributor contract with account1 as owner', async () => {
        const tokenDistributor = await createTokenDistributor(account1, 100, 1535101200, 60);
        const tokenDistributorOwner = await tokenDistributor.owner.call();

        assert.equal(account1, tokenDistributorOwner);
    });

    it('should be able to transfer tokens to account2', async () => {
        const tokenDistributor = await createTokenDistributor(account1, 100, 1535101200, 60);

        const tokensAmount = 3;
        await token.transfer(tokenDistributor.address, tokensAmount);
        const transferedTokensAmount = await token.balanceOf(tokenDistributor.address);

        assert.equal(tokensAmount, transferedTokensAmount.toString());

        await tokenDistributor.transfer(account2, { from: account1 });
        const availableTokensToTransfer = await tokenDistributor.tokensAvailableForCurrentPhase();
        const account2TokensAmount = await token.balanceOf(account2);

        assert(availableTokensToTransfer.toString(), account2TokensAmount.toString());
    });

    it('should generate correct phases data', async () => {
        const phaseInitDate = 1535101200;
        const phaseInterval = 60;
        const tokenDistributor = await createTokenDistributor(account1, 100, phaseInitDate, phaseInterval);

        for (let i = 1; i <= 8; i++) {
            const phaseNumber = i;
            const phase = await tokenDistributor.getPhaseByNumber(phaseNumber);
            const percent = phaseNumber < 7 ? 10 : 20;
            const activationDate = phaseInitDate + (phaseNumber - 1) * phaseInterval;
            const logIndex = ' index: [' + i + ']';

            assert.equal(phaseNumber, phase[0].toString(), 'Phase number' + logIndex);
            assert.equal(activationDate, phase[1].toString(), 'Phase activation date' + logIndex);
            assert.equal(percent, phase[2].toString(), 'Phase percent' + logIndex);
            assert.equal(false, phase[3], 'Did tokens transfered' + logIndex);
        }
    });

    it('should returns correct phase number', async () => {
        const safeRange = 60 * 60;
        const phaseInitDate = getCurrentEpochTime() - 60 * 60 * 24 - safeRange; // 1 day before
        const phaseInterval = 60 * 60 * 24;
        const tokenDistributor = await createTokenDistributor(account1, 100, phaseInitDate, phaseInterval);

        const currentPhase = await tokenDistributor.getCurrentPhaseNumber();
        assert.equal(2, currentPhase.toString());

    });

    it('should returns correct phase number for all cases', async () => {
        const safeRange = 60 * 60;
        const phaseInterval = 60 * 60 * 24;

        for (let i = 1; i <= 8; i++) {
            const phaseNumber = i;
            const phaseInitDate = getCurrentEpochTime() - (phaseNumber - 1) * phaseInterval - safeRange; // "n" days before
            const tokenDistributor = await createTokenDistributor(account1, 100, phaseInitDate, phaseInterval);

            const currentPhase = await tokenDistributor.getCurrentPhaseNumber();
            assert.equal(phaseNumber, currentPhase.toString(), "Current phase number for test:" + phaseNumber);
        }
    });

    it('should return 10% of tokens in 1th phase', async () => {
        await testAvailableTokensForPhase(1, 100, 10);
    });

    it('should return 20% of tokens in 2th phase (without any transfers)', async () => {
        await testAvailableTokensForPhase(2, 100, 20);
    });

    it('should return 30% of tokens in 3th phase (without any transfers)', async () => {
        await testAvailableTokensForPhase(3, 100, 30);
    });

    it('should return 40% of tokens in 4th phase (without any transfers)', async () => {
        await testAvailableTokensForPhase(4, 100, 40);
    });

    it('should return 50% of tokens in 5th phase (without any transfers)', async () => {
        await testAvailableTokensForPhase(5, 100, 50);
    });

    it('should return 60% of tokens in 6th phase (without any transfers)', async () => {
        await testAvailableTokensForPhase(6, 100, 60);
    });

    it('should return 80% of tokens in 7th phase (without any transfers)', async () => {
        await testAvailableTokensForPhase(7, 100, 80);
    });

    it('should return 100% of tokens after 8th phase (without any transfers)', async () => {
        await testAvailableTokensForPhase(8, 100, 100);
    });

    it('should transfer 10% in 1th phase', async () => {
        const tokenDistributor = await testTokensTransferForPhase(1, 100, 10);
        const expectedTransferedValues = [null, true, false, false, false, false, false, false, false];
        await testTransferedParam(tokenDistributor, expectedTransferedValues);
    });

    it('should transfer 20% in 2th phase', async () => {
        const tokenDistributor = await testTokensTransferForPhase(2, 100, 20);
        const expectedTransferedValues = [null, true, true, false, false, false, false, false, false];
        await testTransferedParam(tokenDistributor, expectedTransferedValues);
    });

    it('should transfer 30% in 3th phase', async () => {
        const tokenDistributor = await testTokensTransferForPhase(3, 100, 30);
        const expectedTransferedValues = [null, true, true, true, false, false, false, false, false];
        await testTransferedParam(tokenDistributor, expectedTransferedValues);
    });

    it('should transfer 40% in 4th phase', async () => {
        const tokenDistributor = await testTokensTransferForPhase(4, 100, 40);
        const expectedTransferedValues = [null, true, true, true, true, false, false, false, false];
        await testTransferedParam(tokenDistributor, expectedTransferedValues);
    });

    it('should transfer 50% in 5th phase', async () => {
        const tokenDistributor = await testTokensTransferForPhase(5, 100, 50);
        const expectedTransferedValues = [null, true, true, true, true, true, false, false, false];
        await testTransferedParam(tokenDistributor, expectedTransferedValues);
    });

    it('should transfer 60% in 6th phase', async () => {
        const tokenDistributor = await testTokensTransferForPhase(6, 100, 60);
        const expectedTransferedValues = [null, true, true, true, true, true, true, false, false];
        await testTransferedParam(tokenDistributor, expectedTransferedValues);
    });

    it('should transfer 80% in 7th phase', async () => {
        const tokenDistributor = await testTokensTransferForPhase(7, 100, 80);
        const expectedTransferedValues = [null, true, true, true, true, true, true, true, false];
        await testTransferedParam(tokenDistributor, expectedTransferedValues);
    });

    it('should transfer 100% in 8th phase', async () => {
        const tokenDistributor = await testTokensTransferForPhase(8, 100, 100);
        const expectedTransferedValues = [null, true, true, true, true, true, true, true, true];
        await testTransferedParam(tokenDistributor, expectedTransferedValues);
    });

    it('should not generate more than 8 phases', async () => {
        const tokenDistributor = await createTokenDistributor(account1, 100, 1535101200, 60);

        expectThrow(tokenDistributor.getPhaseByNumber(9));
    });

    it('should not transfer any tokens before 1th phase', async () => {
        const phaseInitDate = getCurrentEpochTime() + 60 * 60 * 24;
        const phaseInterval = 60 * 60 * 24;
        const initTokensAmount = 100;
        const tokenDistributor = await createTokenDistributor(account1, initTokensAmount, phaseInitDate, phaseInterval);

        await token.transfer(tokenDistributor.address, initTokensAmount);
        expectThrow(tokenDistributor.transfer(account2, { from: account1 }));
    });

    it('should not transfer any tokens after double transfer', async () => {
        const initTokensAmount = 100;
        const tokenDistributor = await testTokensTransferForPhase(1, initTokensAmount, 10);

        await token.transfer(tokenDistributor.address, initTokensAmount);
        // and once again
        expectThrow(tokenDistributor.transfer(account2, { from: account1 }));
    });
});
