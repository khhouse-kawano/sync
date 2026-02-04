"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openController = void 0;
const openService_1 = require("../services/openService");
exports.openController = {
    handleOpen: async (req, res) => {
        const result = await openService_1.openService.process(req);
        res.writeHead(200, result.headers);
        res.end(result.img);
    }
};
