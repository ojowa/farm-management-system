"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidDate = exports.formatDate = void 0;
const formatDate = (date) => {
    return date.toISOString();
};
exports.formatDate = formatDate;
const isValidDate = (date) => {
    return date instanceof Date && !isNaN(date.getTime());
};
exports.isValidDate = isValidDate;
