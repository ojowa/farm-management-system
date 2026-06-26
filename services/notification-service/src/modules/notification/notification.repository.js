"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationRepository = void 0;
const database_1 = require("@farm/database");
const asType = (type) => {
    const allowed = ['INFO', 'WARNING', 'ALERT', 'SUCCESS'];
    return (allowed.includes(type) ? type : 'INFO');
};
class NotificationRepository {
    async create(data) {
        return database_1.prisma.notification.create({
            data: {
                userId: data.userId,
                title: data.title,
                message: data.message,
                type: asType(data.type),
            },
        });
    }
    async findById(id) {
        return database_1.prisma.notification.findUnique({
            where: { id },
        });
    }
    async findByUserId(userId, options) {
        return database_1.prisma.notification.findMany({
            where: {
                userId,
                ...(options?.unreadOnly && { read: false }),
            },
            orderBy: { createdAt: 'desc' },
            take: options?.limit,
            skip: options?.offset,
        });
    }
    async findAll(options) {
        return database_1.prisma.notification.findMany({
            orderBy: { createdAt: 'desc' },
            take: options?.limit,
            skip: options?.offset,
        });
    }
    async update(id, data) {
        return database_1.prisma.notification.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        });
    }
    async markAsRead(id) {
        return database_1.prisma.notification.update({
            where: { id },
            data: { read: true },
        });
    }
    async markAllAsRead(userId) {
        const result = await database_1.prisma.notification.updateMany({
            where: { userId, read: false },
            data: { read: true },
        });
        return result.count;
    }
    async delete(id) {
        await database_1.prisma.notification.delete({
            where: { id },
        });
    }
    async countUnread(userId) {
        return database_1.prisma.notification.count({
            where: { userId, read: false },
        });
    }
}
exports.NotificationRepository = NotificationRepository;
