import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prismaClient?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL tanımlı değil. Proje kökündeki .env dosyasını kontrol edin."
    );
  }

  const adapter = new PrismaPg({
    connectionString,
  });

  return new PrismaClient({
    adapter,
  });
}

function getPrismaClient(): PrismaClient {
  if (globalForPrisma.prismaClient) {
    return globalForPrisma.prismaClient;
  }

  const client = createPrismaClient();

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prismaClient = client;
  }

  return client;
}

export { getPrismaClient };

/**
 * Prisma bağlantısını yalnızca gerçekten kullanıldığı anda oluşturur.
 *
 * Böylece DATABASE_URL henüz tanımlı değilken Next.js build işlemi,
 * API dosyalarını yalnızca içe aktarırken başarısız olmaz.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrismaClient();
    const value = Reflect.get(client, property, client);

    if (typeof value === "function") {
      return value.bind(client);
    }

    return value;
  },
});