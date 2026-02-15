"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = global;
exports.prisma = globalForPrisma.prisma ||
    new client_1.PrismaClient({
        log: process.env.ENVIRONMENT === 'prod' ? ['error'] : ['query', 'error', 'warn'],
    });
if (process.env.ENVIRONMENT !== 'prod')
    globalForPrisma.prisma = exports.prisma;
//# sourceMappingURL=prisma.js.map