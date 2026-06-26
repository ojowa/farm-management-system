"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const platform_socket_io_1 = require("@nestjs/platform-socket.io");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors();
    app.useGlobalPipes(new common_1.ValidationPipe());
    app.useWebSocketAdapter(new platform_socket_io_1.IoAdapter(app));
    const port = process.env.NOTIFICATION_SERVICE_PORT || 3006;
    await app.listen(port);
    console.log(`Notification Service is running on: http://localhost:${port}`);
}
bootstrap();
