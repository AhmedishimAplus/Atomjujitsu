const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');
const Sale = require('../models/Sale');
const Staff = require('../models/Staff');
const Product = require('../models/Product');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

describe('Water Bottle Allowance System Tests', () => {
    let authToken, adminUser, staffMember, largeWaterBottle, smallWaterBottle, testUser;

    beforeAll(async () => {
        // Connect to test database
        await mongoose.connect(process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/atomjujitsu-test');

        // Clear relevant collections
        await Promise.all([
            Sale.deleteMany({}),
            Staff.deleteMany({}),
            Product.deleteMany({}),
            User.deleteMany({})
        ]);

        // Create test admin user
        adminUser = await User.create({
            name: 'Test Admin',
            email: 'testadmin@example.com',
            password: 'password123',
            isVerified: true,
            role: 'admin'
        });

        // Generate auth token
        authToken = jwt.sign(
            { id: adminUser._id, role: adminUser.role },
            process.env.JWT_SECRET || 'testjwtsecret',
            { expiresIn: '1h' }
        );

        // Create staff member
        staffMember = await Staff.create({
            name: 'Test Staff',
            Large_bottles: 2,
            Small_bottles: 2
        });

        // Create water bottle products
        largeWaterBottle = await Product.create({
            name: 'Large Water Bottle',
            sellPrice: 5.00,
            staffPrice: 3.00,
            costPrice: 1.50,
            stock: 100,
            categoryId: new mongoose.Types.ObjectId(),
            subcategory: 'Drinks',
            description: 'Large water bottle',
            isAvailable: true,
            owner: 'Gym'
        });

        smallWaterBottle = await Product.create({
            name: 'Small Water Bottle',
            sellPrice: 3.00,
            staffPrice: 1.50,
            costPrice: 0.75,
            stock: 100,
            categoryId: new mongoose.Types.ObjectId(),
            subcategory: 'Drinks',
            description: 'Small water bottle',
            isAvailable: true,
            owner: 'Gym'
        });

        // Create test user for sales
        testUser = await User.create({
            name: 'Test User',
            email: 'testuser@example.com',
            password: 'password123',
            isVerified: true,
            role: 'user'
        });
    });

    afterAll(async () => {
        // Disconnect from MongoDB
        await mongoose.connection.close();
    });

    it('should give free large water bottles when staff has allowance', async () => {
        // Create a sale with 1 large water bottle (should be free)
        const saleData = {
            items: [
                {
                    productId: largeWaterBottle._id,
                    name: largeWaterBottle.name,
                    quantity: 1,
                    regularPrice: largeWaterBottle.sellPrice,
                    staffPrice: largeWaterBottle.staffPrice,
                    priceUsed: largeWaterBottle.staffPrice
                }
            ],
            subtotal: largeWaterBottle.staffPrice,
            staffDiscount: true,
            staffId: staffMember._id,
            staffName: staffMember.name,
            paymentMethod: 'Cash',
            total: largeWaterBottle.staffPrice
        };

        const response = await request(app)
            .post('/api/sales')
            .set('Authorization', `Bearer ${authToken}`)
            .send(saleData);

        expect(response.status).toBe(201);
        expect(response.body.largeWaterBottlesFree).toBe(1);
        expect(response.body.total).toBe(0); // Should be free

        // Check that staff allowance was updated
        const updatedStaff = await Staff.findById(staffMember._id);
        expect(updatedStaff.Large_bottles).toBe(1); // 2 - 1 = 1
    });

    it('should only give remaining allowance when ordering more than available allowance', async () => {
        // Create a sale with 2 large water bottles (only 1 should be free)
        const saleData = {
            items: [
                {
                    productId: largeWaterBottle._id,
                    name: largeWaterBottle.name,
                    quantity: 2,
                    regularPrice: largeWaterBottle.sellPrice,
                    staffPrice: largeWaterBottle.staffPrice,
                    priceUsed: largeWaterBottle.staffPrice
                }
            ],
            subtotal: largeWaterBottle.staffPrice * 2,
            staffDiscount: true,
            staffId: staffMember._id,
            staffName: staffMember.name,
            paymentMethod: 'Cash',
            total: largeWaterBottle.staffPrice * 2
        };

        const response = await request(app)
            .post('/api/sales')
            .set('Authorization', `Bearer ${authToken}`)
            .send(saleData);

        expect(response.status).toBe(201);
        expect(response.body.largeWaterBottlesFree).toBe(1);
        expect(response.body.total).toBe(largeWaterBottle.staffPrice); // Only 1 should be charged

        // Check that staff allowance was updated
        const updatedStaff = await Staff.findById(staffMember._id);
        expect(updatedStaff.Large_bottles).toBe(0); // 1 - 1 = 0
    });

    it('should give free small water bottles when staff has allowance', async () => {
        // Create a sale with 1 small water bottle (should be free)
        const saleData = {
            items: [
                {
                    productId: smallWaterBottle._id,
                    name: smallWaterBottle.name,
                    quantity: 1,
                    regularPrice: smallWaterBottle.sellPrice,
                    staffPrice: smallWaterBottle.staffPrice,
                    priceUsed: smallWaterBottle.staffPrice
                }
            ],
            subtotal: smallWaterBottle.staffPrice,
            staffDiscount: true,
            staffId: staffMember._id,
            staffName: staffMember.name,
            paymentMethod: 'Cash',
            total: smallWaterBottle.staffPrice
        };

        const response = await request(app)
            .post('/api/sales')
            .set('Authorization', `Bearer ${authToken}`)
            .send(saleData);

        expect(response.status).toBe(201);
        expect(response.body.smallWaterBottlesFree).toBe(1);
        expect(response.body.total).toBe(0); // Should be free

        // Check that staff allowance was updated
        const updatedStaff = await Staff.findById(staffMember._id);
        expect(updatedStaff.Small_bottles).toBe(1); // 2 - 1 = 1
    });

    it('should charge for water bottles when allowance is depleted', async () => {
        // First, deplete the remaining small bottle allowance
        await Staff.findByIdAndUpdate(staffMember._id, { Small_bottles: 0 });

        // Create a sale with 1 small water bottle (should be charged)
        const saleData = {
            items: [
                {
                    productId: smallWaterBottle._id,
                    name: smallWaterBottle.name,
                    quantity: 1,
                    regularPrice: smallWaterBottle.sellPrice,
                    staffPrice: smallWaterBottle.staffPrice,
                    priceUsed: smallWaterBottle.staffPrice
                }
            ],
            subtotal: smallWaterBottle.staffPrice,
            staffDiscount: true,
            staffId: staffMember._id,
            staffName: staffMember.name,
            paymentMethod: 'Cash',
            total: smallWaterBottle.staffPrice
        };

        const response = await request(app)
            .post('/api/sales')
            .set('Authorization', `Bearer ${authToken}`)
            .send(saleData);

        expect(response.status).toBe(201);
        expect(response.body.smallWaterBottlesFree).toBe(0);
        expect(response.body.total).toBe(smallWaterBottle.staffPrice); // Should be charged

        // Check that staff allowance remains 0
        const updatedStaff = await Staff.findById(staffMember._id);
        expect(updatedStaff.Small_bottles).toBe(0);
    });

    it('should correctly handle mixed water bottle types in one order', async () => {
        // Reset staff allowances for this test
        await Staff.findByIdAndUpdate(staffMember._id, {
            Large_bottles: 1,
            Small_bottles: 1
        });

        // Create a sale with both large and small water bottles
        const saleData = {
            items: [
                {
                    productId: largeWaterBottle._id,
                    name: largeWaterBottle.name,
                    quantity: 1,
                    regularPrice: largeWaterBottle.sellPrice,
                    staffPrice: largeWaterBottle.staffPrice,
                    priceUsed: largeWaterBottle.staffPrice
                },
                {
                    productId: smallWaterBottle._id,
                    name: smallWaterBottle.name,
                    quantity: 1,
                    regularPrice: smallWaterBottle.sellPrice,
                    staffPrice: smallWaterBottle.staffPrice,
                    priceUsed: smallWaterBottle.staffPrice
                }
            ],
            subtotal: largeWaterBottle.staffPrice + smallWaterBottle.staffPrice,
            staffDiscount: true,
            staffId: staffMember._id,
            staffName: staffMember.name,
            paymentMethod: 'Cash',
            total: largeWaterBottle.staffPrice + smallWaterBottle.staffPrice
        };

        const response = await request(app)
            .post('/api/sales')
            .set('Authorization', `Bearer ${authToken}`)
            .send(saleData);

        expect(response.status).toBe(201);
        expect(response.body.largeWaterBottlesFree).toBe(1);
        expect(response.body.smallWaterBottlesFree).toBe(1);
        expect(response.body.total).toBe(0); // Both should be free

        // Check that staff allowances were updated
        const updatedStaff = await Staff.findById(staffMember._id);
        expect(updatedStaff.Large_bottles).toBe(0);
        expect(updatedStaff.Small_bottles).toBe(0);
    });

    it('should get water bottle usage report', async () => {
        const response = await request(app)
            .get('/api/reports/water-bottle-usage')
            .set('Authorization', `Bearer ${authToken}`);

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);

        // Find our test staff member in the report
        const staffReport = response.body.find(item => item.staffId === staffMember._id.toString());
        expect(staffReport).toBeDefined();
        expect(staffReport.largeBottlesUsed).toBeGreaterThanOrEqual(3); // From our tests
        expect(staffReport.smallBottlesUsed).toBeGreaterThanOrEqual(3); // From our tests
        expect(staffReport.largeBottlesFree).toBeGreaterThanOrEqual(2); // From our tests
        expect(staffReport.smallBottlesFree).toBeGreaterThanOrEqual(1); // From our tests
    });
});
