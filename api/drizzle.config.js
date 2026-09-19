"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
const drizzle_kit_1 = require("drizzle-kit");
(0, dotenv_1.config)({ path: "./.env" });
console.log("DATABASE_URL:", process.env.DATABASE_URL);
exports.default = (0, drizzle_kit_1.defineConfig)({
    schema: "./src/database/schema/index.ts",
    out: "./drizzle",
    dialect: "postgresql",
    dbCredentials: {
        url: process.env.DATABASE_URL,
    },
    verbose: true,
    strict: true,
});
//# sourceMappingURL=drizzle.config.js.map