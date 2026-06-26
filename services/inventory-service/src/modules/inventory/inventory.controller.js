"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryController = void 0;
const inventory_service_1 = require("./inventory.service");
const validation_1 = require("@farm/validation");
const inventoryService = new inventory_service_1.InventoryService();
class InventoryController {
    async createInventoryItem(req, res) {
        try {
            const validated = validation_1.createInventoryItemSchema.parse(req.body);
            const item = await inventoryService.createInventoryItem(validated);
            res.status(201).json(item);
        }
        catch (error) {
            res.status(400).json({ error: error.message || error });
        }
    }
    async getInventoryItemById(req, res) {
        try {
            const id = req.params.id;
            const item = await inventoryService.getInventoryItemById(id);
            res.json(item);
        }
        catch (error) {
            res.status(404).json({ error: error.message || error });
        }
    }
    async getAllInventoryItems(req, res) {
        try {
            const items = await inventoryService.getAllInventoryItems();
            res.json(items);
        }
        catch (error) {
            res.status(500).json({ error: error.message || error });
        }
    }
    async updateInventoryItem(req, res) {
        try {
            const id = req.params.id;
            const validated = validation_1.updateInventoryItemSchema.parse(req.body);
            const item = await inventoryService.updateInventoryItem(id, validated);
            res.json(item);
        }
        catch (error) {
            res.status(400).json({ error: error.message || error });
        }
    }
    async deleteInventoryItem(req, res) {
        try {
            const id = req.params.id;
            await inventoryService.deleteInventoryItem(id);
            res.status(204).send();
        }
        catch (error) {
            res.status(404).json({ error: error.message || error });
        }
    }
}
exports.InventoryController = InventoryController;
