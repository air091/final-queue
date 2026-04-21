import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

const createPrismaClient = () => {
  return new PrismaClient({ adapter });
};

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}
const prisma = global.prisma ?? createPrismaClient();

// Prevent multiple instances in dev (hot reload)
if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

export default prisma;
