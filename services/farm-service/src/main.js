"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const dotenv_1 = __importDefault(require("dotenv"));
const farm_module_1 = require("./modules/farm/farm.module");
const express_2 = require("../../../packages/auth/src/express/index");
const auth_1 = require("@farm/auth");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.FARM_SERVICE_PORT || 3003;
app.use((0, cors_1.default)());
app.use((0, helmet_1.default)());
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json());
app.use('/api', farm_module_1.farmRouter);
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'farm-service' });
});
// Centralized auth error handler: turns AuthError thrown from the per-route
// middleware into a clean 401/403 response. Other errors fall through.
app.use((err, req, res, _next) => {
    if (err instanceof auth_1.AuthError) {
        return res
            .status(err.statusCode)
            .json({ statusCode: err.statusCode, message: err.message });
    }
    return res.status(500).json({ statusCode: 500, message: 'Internal server error' });
});
void express_2.authMiddleware; // ensure import is not tree-shaken
app.listen(port, () => {
    console.log(`Farm service listening at http://localhost:${port}`);
});
