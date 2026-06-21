import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

const ADMIN_ADDRESSES = process.env.ADMIN_ADDRESSES;

async function seedAdmin() {
  if (!ADMIN_ADDRESSES) {
    console.log("No ADMIN_ADDRESSES env var set. Nothing to seed.");
    await prisma.$disconnect();
    return;
  }

  const addresses = ADMIN_ADDRESSES.split(",").map((a) => a.trim()).filter(Boolean);

  if (addresses.length === 0) {
    console.log("No admin addresses found in ADMIN_ADDRESSES.");
    await prisma.$disconnect();
    return;
  }

  console.log(`Seeding ${addresses.length} admin address(es)...`);

  for (const address of addresses) {
    await prisma.user.upsert({
      where: { address },
      create: {
        address,
        usdBalance: 0,
        usdcBalance: 0,
        isAdmin: true,
      },
      update: {
        isAdmin: true,
      },
    });
    console.log(`  ✓ Admin set for ${address}`);
  }

  console.log("Done seeding admin addresses.");
  await prisma.$disconnect();
}

seedAdmin().catch((e) => {
  console.error("Failed to seed admin addresses:", e);
  process.exit(1);
});
