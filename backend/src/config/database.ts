import { PrismaClient } from '@prisma/client';

// Singleton pattern for Prisma client
// This prevents multiple instances during hot reloading in development

declare global {
    // eslint-disable-next-line no-var, vars-on-top
    var prisma: PrismaClient | undefined;
}

const prismaClientSingleton = (): PrismaClient => {
    return new PrismaClient({
        log: process.env.NODE_ENV === 'development'
            ? ['query', 'info', 'warn', 'error']
            : ['error'],
        errorFormat: 'pretty',
    });
};

export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
    globalThis.prisma = prisma;
}

// Graceful shutdown
process.on('beforeExit', async () => {
    await prisma.$disconnect();
});

export default prisma;
