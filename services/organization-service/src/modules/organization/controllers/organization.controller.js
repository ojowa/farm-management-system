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
exports.OrganizationController = void 0;
const common_1 = require("@nestjs/common");
const organization_service_1 = require("../services/organization.service");
const utils_1 = require("@farm/utils");
const validation_1 = require("@farm/validation");
const auth_1 = require("@farm/auth");
let OrganizationController = class OrganizationController {
    organizationService;
    constructor(organizationService) {
        this.organizationService = organizationService;
    }
    // Public-ish: registration happens through the auth-service which then
    // creates the org. This endpoint is reserved for support / import flows.
    async create(createDto) {
        return this.organizationService.create(createDto);
    }
    async findOne(id) {
        return this.organizationService.findOne(id);
    }
    async findBySlug(slug) {
        return this.organizationService.findBySlug(slug);
    }
    async update(id, updateDto) {
        return this.organizationService.update(id, updateDto);
    }
    async delete(id) {
        return this.organizationService.delete(id);
    }
    async findAll() {
        return this.organizationService.findAll();
    }
};
exports.OrganizationController = OrganizationController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(auth_1.JwtAuthGuard, auth_1.AuthorizationGuard),
    (0, auth_1.Roles)('SUPER_ADMIN', 'SUPPORT_ADMIN'),
    (0, common_1.UsePipes)(new utils_1.ZodValidationPipe(validation_1.createOrganizationSchema)),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OrganizationController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(auth_1.JwtAuthGuard, auth_1.AuthorizationGuard),
    (0, auth_1.Permission)('organization.read'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrganizationController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)('slug/:slug'),
    (0, common_1.UseGuards)(auth_1.JwtAuthGuard, auth_1.AuthorizationGuard),
    (0, auth_1.Permission)('organization.read'),
    __param(0, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrganizationController.prototype, "findBySlug", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, common_1.UseGuards)(auth_1.JwtAuthGuard, auth_1.AuthorizationGuard),
    (0, auth_1.Roles)('ORGANIZATION_OWNER', 'SUPER_ADMIN'),
    (0, auth_1.Permission)('organization.write'),
    (0, common_1.UsePipes)(new utils_1.ZodValidationPipe(validation_1.updateOrganizationSchema)),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], OrganizationController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(auth_1.JwtAuthGuard, auth_1.AuthorizationGuard),
    (0, auth_1.Roles)('ORGANIZATION_OWNER', 'SUPER_ADMIN'),
    (0, auth_1.Permission)('organization.delete'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OrganizationController.prototype, "delete", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(auth_1.JwtAuthGuard, auth_1.AuthorizationGuard),
    (0, auth_1.Roles)('SUPER_ADMIN', 'SUPPORT_ADMIN', 'ORGANIZATION_OWNER'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OrganizationController.prototype, "findAll", null);
exports.OrganizationController = OrganizationController = __decorate([
    (0, common_1.Controller)('organizations'),
    __metadata("design:paramtypes", [organization_service_1.OrganizationService])
], OrganizationController);
