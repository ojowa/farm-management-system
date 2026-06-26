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
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const common_1 = require("@nestjs/common");
const notification_repository_1 = require("./notification.repository");
const notification_gateway_1 = require("./notification.gateway");
let NotificationService = class NotificationService {
    repository;
    gateway;
    constructor(repository, gateway) {
        this.repository = repository;
        this.gateway = gateway;
    }
    async create(createDto) {
        const notification = await this.repository.create(createDto);
        this.gateway.sendToUser(createDto.userId, 'notification:new', notification);
        return notification;
    }
    async findById(id) {
        const notification = await this.repository.findById(id);
        if (!notification) {
            throw new common_1.NotFoundException(`Notification with ID ${id} not found`);
        }
        return notification;
    }
    async findByUserId(userId, options) {
        return this.repository.findByUserId(userId, options);
    }
    async findAll(options) {
        return this.repository.findAll(options);
    }
    async markAsRead(id) {
        const notification = await this.repository.findById(id);
        if (!notification) {
            throw new common_1.NotFoundException(`Notification with ID ${id} not found`);
        }
        const updated = await this.repository.markAsRead(id);
        this.gateway.sendToUser(notification.userId, 'notification:read', updated);
        return updated;
    }
    async markAllAsRead(userId) {
        const count = await this.repository.markAllAsRead(userId);
        this.gateway.sendToUser(userId, 'notification:all-read', { count });
        return count;
    }
    async delete(id) {
        await this.findById(id);
        await this.repository.delete(id);
    }
    async getUnreadCount(userId) {
        return this.repository.countUnread(userId);
    }
    async createBulk(notifications) {
        const created = [];
        for (const dto of notifications) {
            const notification = await this.repository.create(dto);
            created.push(notification);
            this.gateway.sendToUser(dto.userId, 'notification:new', notification);
        }
        return created;
    }
    /**
     * Update a notification by id. Thin wrapper used by the controller so the
     * route handler does not have to reach into the repository directly.
     */
    async update(id, data) {
        await this.findById(id);
        return this.repository.update(id, data);
    }
};
exports.NotificationService = NotificationService;
exports.NotificationService = NotificationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [notification_repository_1.NotificationRepository,
        notification_gateway_1.NotificationGateway])
], NotificationService);
