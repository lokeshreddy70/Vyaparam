import { PrismaClient, Role, BusinessType } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const businessName = process.env.SEED_BUSINESS_NAME;
  const businessTypeRaw = process.env.SEED_BUSINESS_TYPE;
  const ownerName = process.env.SEED_OWNER_NAME;
  const ownerEmail = process.env.SEED_OWNER_EMAIL;
  const ownerPassword = process.env.SEED_OWNER_PASSWORD;

  if (!businessName || !businessTypeRaw || !ownerName || !ownerEmail || !ownerPassword) {
    throw new Error(
      "Missing seed environment variables: SEED_BUSINESS_NAME, SEED_BUSINESS_TYPE, SEED_OWNER_NAME, SEED_OWNER_EMAIL, SEED_OWNER_PASSWORD",
    );
  }

  const allowedTypes = Object.values(BusinessType);
  if (!allowedTypes.includes(businessTypeRaw as BusinessType)) {
    throw new Error(`Invalid SEED_BUSINESS_TYPE: ${businessTypeRaw}`);
  }

  const business = await prisma.business.create({
    data: {
      name: businessName,
      type: businessTypeRaw as BusinessType,
      address: process.env.SEED_BUSINESS_ADDRESS || null,
      phone: process.env.SEED_BUSINESS_PHONE || null,
      gstNumber: process.env.SEED_BUSINESS_GST || null,
    },
  });

  const passwordHash = await bcrypt.hash(ownerPassword, 10);
  const owner = await prisma.user.create({
    data: {
      businessId: business.id,
      name: ownerName,
      email: ownerEmail,
      passwordHash,
      role: Role.OWNER,
    },
  });

  console.log("Seed complete.");
  console.log("Business ID:", business.id, "Owner ID:", owner.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
