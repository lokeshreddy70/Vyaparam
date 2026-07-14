import { PrismaClient, Role, BusinessType, TableStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const business = await prisma.business.create({
    data: {
      name: 'Demo Bistro',
      type: BusinessType.RESTAURANT,
      address: '12 MG Road, Bengaluru',
      phone: '+91 90000 00000',
      gstNumber: '29ABCDE1234F1Z5',
    },
  });

  const passwordHash = await bcrypt.hash('Password@123', 10);

  const owner = await prisma.user.create({
    data: {
      businessId: business.id,
      name: 'Asha Rao',
      email: 'owner@demobistro.test',
      passwordHash,
      role: Role.OWNER,
    },
  });

  await prisma.user.createMany({
    data: [
      { businessId: business.id, name: 'Manager Vikram', email: 'manager@demobistro.test', passwordHash, role: Role.MANAGER },
      { businessId: business.id, name: 'Cashier Priya', email: 'cashier@demobistro.test', passwordHash, role: Role.CASHIER },
      { businessId: business.id, name: 'Chef Ramesh', email: 'kitchen@demobistro.test', passwordHash, role: Role.KITCHEN_STAFF },
      { businessId: business.id, name: 'Waiter Suresh', email: 'waiter@demobistro.test', passwordHash, role: Role.WAITER },
    ],
  });

  const starters = await prisma.category.create({ data: { businessId: business.id, name: 'Starters' } });
  const mains = await prisma.category.create({ data: { businessId: business.id, name: 'Main Course' } });
  const beverages = await prisma.category.create({ data: { businessId: business.id, name: 'Beverages' } });

  await prisma.product.createMany({
    data: [
      { businessId: business.id, categoryId: starters.id, name: 'Paneer Tikka', price: 220, taxPercent: 5 },
      { businessId: business.id, categoryId: starters.id, name: 'Veg Spring Rolls', price: 180, taxPercent: 5 },
      { businessId: business.id, categoryId: mains.id, name: 'Butter Chicken', price: 320, taxPercent: 5 },
      { businessId: business.id, categoryId: mains.id, name: 'Dal Makhani', price: 240, taxPercent: 5 },
      { businessId: business.id, categoryId: mains.id, name: 'Veg Biryani', price: 260, taxPercent: 5 },
      { businessId: business.id, categoryId: beverages.id, name: 'Masala Chai', price: 60, taxPercent: 5 },
      { businessId: business.id, categoryId: beverages.id, name: 'Fresh Lime Soda', price: 90, taxPercent: 5 },
    ],
  });

  await prisma.restaurantTable.createMany({
    data: [
      { businessId: business.id, label: 'T1', capacity: 2, status: TableStatus.AVAILABLE },
      { businessId: business.id, label: 'T2', capacity: 4, status: TableStatus.AVAILABLE },
      { businessId: business.id, label: 'T3', capacity: 4, status: TableStatus.AVAILABLE },
      { businessId: business.id, label: 'T4', capacity: 6, status: TableStatus.AVAILABLE },
      { businessId: business.id, label: 'T5', capacity: 2, status: TableStatus.AVAILABLE },
    ],
  });

  console.log('Seed complete.');
  console.log('Login with owner@demobistro.test / Password@123 (see README for all demo accounts)');
  console.log('Business ID:', business.id, 'Owner ID:', owner.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
