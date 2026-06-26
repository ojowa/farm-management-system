"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.truncate = exports.capitalize = void 0;
const capitalize = (str) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
};
exports.capitalize = capitalize;
const truncate = (str, length) => {
    if (str.length <= length)
        return str;
    return str.slice(0, length) + '...';
};
exports.truncate = truncate;
