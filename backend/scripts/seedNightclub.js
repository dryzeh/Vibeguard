import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const nightclub = await prisma.nightclub.create({
    data: {
      name: "Test Club",
      address: "123 Demo Street",
      // Add any other required fields here if your schema needs them
    }
  });
  console.log("Created nightclub:", nightclub);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());