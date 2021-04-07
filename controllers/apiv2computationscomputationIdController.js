'use strict';

var varapiv2computationscomputationIdController = require('./apiv2computationscomputationIdControllerService');

module.exports.findComputationById = function findComputationById (req, res, next) {
  varapiv2computationscomputationIdController.findComputationById(req.swagger.params, res, next);
};
