"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var bcrypt = require("bcrypt");
var prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var business, passwordHash, owner, starters, mains, beverages;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, prisma.business.create({
                        data: {
                            name: 'Demo Bistro',
                            type: client_1.BusinessType.RESTAURANT,
                            address: '12 MG Road, Bengaluru',
                            phone: '+91 90000 00000',
                            gstNumber: '29ABCDE1234F1Z5',
                        },
                    })];
                case 1:
                    business = _a.sent();
                    return [4 /*yield*/, bcrypt.hash('Password@123', 10)];
                case 2:
                    passwordHash = _a.sent();
                    return [4 /*yield*/, prisma.user.create({
                            data: {
                                businessId: business.id,
                                name: 'Asha Rao',
                                email: 'owner@demobistro.test',
                                passwordHash: passwordHash,
                                role: client_1.Role.OWNER,
                            },
                        })];
                case 3:
                    owner = _a.sent();
                    return [4 /*yield*/, prisma.user.createMany({
                            data: [
                                { businessId: business.id, name: 'Manager Vikram', email: 'manager@demobistro.test', passwordHash: passwordHash, role: client_1.Role.MANAGER },
                                { businessId: business.id, name: 'Cashier Priya', email: 'cashier@demobistro.test', passwordHash: passwordHash, role: client_1.Role.CASHIER },
                                { businessId: business.id, name: 'Chef Ramesh', email: 'kitchen@demobistro.test', passwordHash: passwordHash, role: client_1.Role.KITCHEN_STAFF },
                                { businessId: business.id, name: 'Waiter Suresh', email: 'waiter@demobistro.test', passwordHash: passwordHash, role: client_1.Role.WAITER },
                            ],
                        })];
                case 4:
                    _a.sent();
                    return [4 /*yield*/, prisma.category.create({ data: { businessId: business.id, name: 'Starters' } })];
                case 5:
                    starters = _a.sent();
                    return [4 /*yield*/, prisma.category.create({ data: { businessId: business.id, name: 'Main Course' } })];
                case 6:
                    mains = _a.sent();
                    return [4 /*yield*/, prisma.category.create({ data: { businessId: business.id, name: 'Beverages' } })];
                case 7:
                    beverages = _a.sent();
                    return [4 /*yield*/, prisma.product.createMany({
                            data: [
                                { businessId: business.id, categoryId: starters.id, name: 'Paneer Tikka', price: 220, taxPercent: 5 },
                                { businessId: business.id, categoryId: starters.id, name: 'Veg Spring Rolls', price: 180, taxPercent: 5 },
                                { businessId: business.id, categoryId: mains.id, name: 'Butter Chicken', price: 320, taxPercent: 5 },
                                { businessId: business.id, categoryId: mains.id, name: 'Dal Makhani', price: 240, taxPercent: 5 },
                                { businessId: business.id, categoryId: mains.id, name: 'Veg Biryani', price: 260, taxPercent: 5 },
                                { businessId: business.id, categoryId: beverages.id, name: 'Masala Chai', price: 60, taxPercent: 5 },
                                { businessId: business.id, categoryId: beverages.id, name: 'Fresh Lime Soda', price: 90, taxPercent: 5 },
                            ],
                        })];
                case 8:
                    _a.sent();
                    return [4 /*yield*/, prisma.restaurantTable.createMany({
                            data: [
                                { businessId: business.id, label: 'T1', capacity: 2, status: client_1.TableStatus.AVAILABLE },
                                { businessId: business.id, label: 'T2', capacity: 4, status: client_1.TableStatus.AVAILABLE },
                                { businessId: business.id, label: 'T3', capacity: 4, status: client_1.TableStatus.AVAILABLE },
                                { businessId: business.id, label: 'T4', capacity: 6, status: client_1.TableStatus.AVAILABLE },
                                { businessId: business.id, label: 'T5', capacity: 2, status: client_1.TableStatus.AVAILABLE },
                            ],
                        })];
                case 9:
                    _a.sent();
                    console.log('Seed complete.');
                    console.log('Login with owner@demobistro.test / Password@123 (see README for all demo accounts)');
                    console.log('Business ID:', business.id, 'Owner ID:', owner.id);
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (e) {
    console.error(e);
    process.exit(1);
})
    .finally(function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, prisma.$disconnect()];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); });
