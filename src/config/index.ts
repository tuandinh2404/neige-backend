import dotenv from 'dotenv';

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

const envFound = dotenv.config();
if(envFound.error) {
    throw new Error("Không thể tìm thấy tệp .env");
}

export default {
    port: parseInt(process.env.PORT || '3000', 10),
    database: {
        host: process.env.PG_HOST,
        port: process.env.PG_PORT,
        name: process.env.PG_DB,
        user: process.env.PG_USER,
        password: process.env.PG_PASSWORD,
    },

    jwtSecret: process.env.JWT_SECRET!,
    logs: {
        level: process.env.LOG_LEVEL || 'silly',
    },
    agenda: {

    },
    api: {
    prefix: '/api',
    },
}