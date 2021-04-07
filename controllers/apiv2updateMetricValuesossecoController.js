'use strict'

var varv2updateMetricValuesossecoController = require('./apiv2updateMetricValuesossecoControllerService');

module.exports.update = function update(req, res, next) {
  varv2updateMetricValuesossecoController.update(req.swagger.params, res, next);
};