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
exports.OrganizationService = void 0;
const common_1 = require("@nestjs/common");
const organization_repository_1 = require("../repositories/organization.repository");
let OrganizationService = class OrganizationService {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    async create(createDto) {
        const existingBySlug = await this.repository.findBySlug(createDto.slug);
        if (existingBySlug) {
            throw new common_1.ConflictException(`Organization with slug ${createDto.slug} already exists`);
        }
        const existingByEmail = await this.repository.findBySlug(createDto.adminEmail);
        if (existingByEmail) {
            throw new common_1.ConflictException(`Organization with email ${createDto.adminEmail} already exists`);
        }
        return this.repository.create(createDto);
    }
    async findOne(id) {
        const org = await this.repository.findById(id);
        if (!org) {
            throw new common_1.NotFoundException(`Organization with ID ${id} not found`);
        }
        return org;
    }
    async findBySlug(slug) {
        return this.repository.findBySlug(slug);
    }
    async update(id, updateDto) {
        await this.findOne(id);
        return this.repository.update(id, updateDto);
    }
    async findAll() {
        return this.repository.findAll();
    }
    async delete(id) {
        await this.findOne(id);
        await this.repository.delete(id);
    }
};
exports.OrganizationService = OrganizationService;
exports.OrganizationService = OrganizationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [organization_repository_1.OrganizationRepository])
], OrganizationService);
