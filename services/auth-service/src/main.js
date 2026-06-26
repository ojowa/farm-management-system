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
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const auth_1 = require("@farm/auth");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.AUTH_SERVICE_PORT || 3002;
app.use((0, cors_1.default)());
app.use((0, helmet_1.default)());
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json());
// Routes
app.use('/auth', auth_routes_1.default);
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'auth-service' });
});
// Centralized handler for AuthError thrown from `authMiddleware`.
app.use((err, req, res, _next) => {
    if (err instanceof auth_1.AuthError) {
        return res
            .status(err.statusCode)
            .json({ statusCode: err.statusCode, message: err.message });
    }
    return res.status(500).json({ statusCode: 500, message: 'Internal server error' });
});
app.listen(port, () => {
    console.log(`Auth service listening at http://localhost:${port}`);
});
