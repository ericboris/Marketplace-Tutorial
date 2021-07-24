const Marketplace = artifacts.require('Marketplace');

require('chai')
    .use(require('chai-as-promised'))
    .should();

contract('Marketplace', ([deployer, seller, buyer]) => {
    let marketplace;

    before(async () => {
        marketplace = await Marketplace.deployed();
    });

    describe('deployment', async () => {
        it('deploys successfully', async () => {
            const address = await marketplace.address;
            assert.notEqual(address, 0x0);
            assert.notEqual(address, '');
            assert.notEqual(address, null);
            assert.notEqual(address, undefined);
        });

        it('has a name', async () => {
            const name = await marketplace.name();
            assert.equal(name, 'Marketplace', 'correct name is assigned');
        });
    });

    describe('products', async () => {
        let result, productCount

        before(async () => {
            result = await marketplace.createProduct('phone', web3.utils.toWei('1', 'Ether'), { from: seller });
            productCount = await marketplace.productCount();
        });

        it('creates products', async () => {
            // Success
            assert.equal(productCount, 1);
            const event = result.logs[0].args;
            assert.equal(event.id.toNumber(), productCount.toNumber(), 'id is correct');
            assert.equal(event.name, 'phone', 'name is correct');
            assert.equal(event.price, '1000000000000000000', 'price is correct');
            assert.equal(event.owner, seller, 'owner is correct');
            assert.equal(event.purchased, false, 'purchased flag is correct');

            // Failure: Product must have a valid name
            await await marketplace.createProduct('', web3.utils.toWei('1', 'Ether'), { from: seller }).should.be.rejected;
            // Failure: Product must have a valid price
            await await marketplace.createProduct('phone', 0, { from: seller }).should.be.rejected;
        });

        it('sells products', async () => {
            // Track the seller balance before the purchase
            let oldSellerBalance;
            oldSellerBalance = await web3.eth.getBalance(seller);
            oldSellerBalance = new web3.utils.BN(oldSellerBalance);
            
            let price;
            price = web3.utils.toWei('1', 'Ether');
            price = new web3.utils.BN(price);

            // Success: Buyer makes a purchase
            result = await marketplace.purchaseProduct(productCount, { from: buyer, value: price });

            // Check that seller received funds
            let newSellerBalance;
            newSellerBalance = await web3.eth.getBalance(seller);
            newSellerBalance = new web3.utils.BN(newSellerBalance);

            const expectedBalance = oldSellerBalance.add(price);
            assert.equal(newSellerBalance.toString(), expectedBalance.toString(), 'seller balance is correct');

            // Check logs
            const event = result.logs[0].args;
            assert.equal(event.id.toNumber(), productCount.toNumber(), 'id is correct');
            assert.equal(event.name, 'phone', 'name is correct');
            assert.equal(event.price, '1000000000000000000', 'price is correct');
            assert.equal(event.owner, buyer, 'owner is correct');
            assert.equal(event.purchased, true, 'purchased flag is correct');

            // Failure: Tries to buy a product that doesn't exist
            await marketplace.purchaseProduct(99, { from: buyer, value: web3.utils.toWei('1', 'Ether') }).should.be.rejected;

            // Failure: Buyer supplies insufficient funds
            await marketplace.purchaseProduct(productCount, { from: buyer, value: web3.utils.toWei('0.5', 'Ether') }).should.be.rejected;

            // Failure: Deployer tries to buy product - seller can't be buyer
            await marketplace.purchaseProduct(productCount, { from: deployer, value: web3.utils.toWei('1', 'Ether') }).should.be.rejected;

            // Failure: Buyer tries to buy again - double sale
            await marketplace.purchaseProduct(productCount, { from: buyer, value: web3.utils.toWei('1', 'Ether') }).should.be.rejected;
        });
    });
});
