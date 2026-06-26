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
const auth_1 = require("@farm/auth");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.REPORTING_SERVICE_PORT || 3009;
app.use((0, cors_1.default)());
app.use((0, helmet_1.default)());
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json());
// Reporting endpoints are read-only and accessible to anyone with the
// `reporting.read` permission.
// CRUD for reporting artifacts is implemented in a dedicated router.
const reporting_router_1 = __importDefault(require("./modules/reporting/reporting.router"));
app.use('/api', reporting_router_1.default);
app.use((err, req, res, _next) => {
    if (err instanceof auth_1.AuthError) {
        return res
            .status(err.statusCode)
            .json({ statusCode: err.statusCode, message: err.message });
    }
    return res.status(500).json({ statusCode: 500, message: 'Internal server error' });
});
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'reporting-service' });
});
app.listen(port, () => {
    console.log(`Reporting service listening at http://localhost:${port}`);
});
