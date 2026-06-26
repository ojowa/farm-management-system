"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationController = void 0;
const common_1 = require("@nestjs/common");
const notification_service_1 = require("./notification.service");
const utils_1 = require("@farm/utils");
const validation_1 = require("@farm/validation");
const auth_1 = require("@farm/auth");
let NotificationController = class NotificationController {
    notificationService;
    constructor(notificationService) {
        this.notificationService = notificationService;
    }
    async create(createDto) {
        return this.notificationService.create(createDto);
    }
    async createBulk(notifications) {
        return this.notificationService.createBulk(notifications);
    }
    async findOne(id) {
        return this.notificationService.findById(id);
    }
    async findByUser(userId, unreadOnly, limit, offset) {
        return this.notificationService.findByUserId(userId, {
            unreadOnly: unreadOnly === 'true',
            limit: limit ? parseInt(limit, 10) : undefined,
            offset: offset ? parseInt(offset, 10) : undefined,
        });
    }
    async getUnreadCount(userId) {
        const count = await this.notificationService.getUnreadCount(userId);
        return { count };
    }
    async update(id, updateDto) {
        return this.notificationService.findById(id).then(() => this.notificationService.update(id, updateDto));
    }
    async markAsRead(id) {
        return this.notificationService.markAsRead(id);
    }
    async markAllAsRead(userId) {
        const count = await this.notificationService.markAllAsRead(userId);
        return { count };
    }
    async delete(id) {
        return this.notificationService.delete(id);
    }
    async findAll(limit, offset) {
        return this.notificationService.findAll({
            limit: limit ? parseInt(limit, 10) : undefined,
            offset: offset ? parseInt(offset, 10) : undefined,
        });
    }
};
exports.NotificationController = NotificationController;
__decorate([
    (0, common_1.Post)(),
    (0, auth_1.Roles)('SUPER_ADMIN', 'SUPPORT_ADMIN', 'ORGANIZATION_OWNER', 'FARM_MANAGER'),
    (0, auth_1.Permission)('notification.write'),
    (0, common_1.UsePipes)(new utils_1.ZodValidationPipe(validation_1.createNotificationSchema)),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('bulk'),
    (0, auth_1.Roles)('SUPER_ADMIN', 'SUPPORT_ADMIN', 'ORGANIZATION_OWNER', 'FARM_MANAGER'),
    (0, auth_1.Permission)('notification.write'),
    (0, common_1.UsePipes)(new utils_1.ZodValidationPipe(validation_1.createNotificationSchema)),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "createBulk", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, auth_1.Permission)('notification.read'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)('user/:userId'),
    (0, auth_1.Permission)('notification.read'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Query)('unreadOnly')),
    __param(2, (0, common_1.Query)('limit')),
    __param(3, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "findByUser", null);
__decorate([
    (0, common_1.Get)('user/:userId/unread-count'),
    (0, auth_1.Permission)('notification.read'),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "getUnreadCount", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, auth_1.Permission)('notification.write'),
    (0, common_1.UsePipes)(new utils_1.ZodValidationPipe(validation_1.updateNotificationSchema)),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "update", null);
__decorate([
    (0, common_1.Put)(':id/read'),
    (0, auth_1.Permission)('notification.read'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "markAsRead", null);
__decorate([
    (0, common_1.Put)('user/:userId/read-all'),
    (0, auth_1.Permission)('notification.read'),
    __param(0, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "markAllAsRead", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, auth_1.Roles)('SUPER_ADMIN', 'ORGANIZATION_OWNER', 'FARM_MANAGER'),
    (0, auth_1.Permission)('notification.write'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "delete", null);
__decorate([
    (0, common_1.Get)(),
    (0, auth_1.Permission)('notification.read'),
    __param(0, (0, common_1.Query)('limit')),
    __param(1, (0, common_1.Query)('offset')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], NotificationController.prototype, "findAll", null);
exports.NotificationController = NotificationController = __decorate([
    (0, common_1.Controller)('notifications'),
    (0, common_1.UseGuards)(auth_1.JwtAuthGuard, auth_1.AuthorizationGuard),
    __metadata("design:paramtypes", [notification_service_1.NotificationService])
], NotificationController);
