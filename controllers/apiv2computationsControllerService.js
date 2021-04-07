"use strict";

const crypto = require("crypto");

const computationCalculator = require("./computationCalculator");

const valuesReader = require("./computationCalculator/valuesReader");

const computationsBD = {};

module.exports.addComputation = function addComputation(req, res, next) {
  try {
    const dsl = req.dsl.value;
    console.log("prueba de computations");

    valuesReader.extractData(dsl).then((r) => {
      getPeriods(dsl)
        .then((periods) => {
          const computationId = crypto.randomBytes(8).toString("hex");
          computationsBD[computationId] = null;
          // Calculate the computations
          calculateComputations(dsl, periods)
            .then((computations) => {
              // Set the computations to the bd
              computationsBD[computationId] = computations;
            })
            .catch((err) => {
              console.log("error - addComputation.calculateComputations:", err);
              computationsBD[computationId] = err.message;
            });

          // Send the computation Endpoint
          res.status(201);
          res.send({
            code: 201,
            message: "Created",
            computation: "/api/v2/computations/" + computationId,
          });
        })
        .catch((err) => {
          console.log("error - addComputation.getPeriods:", err);
          sendError(res, err);
        });
    });
  } catch (err) {
    console.log("error - addComputation:", err);
    sendError(res, err);
  }
};

module.exports.getComputation = (computationId) => {
  return new Promise((resolve, reject) => {
    try {
      resolve(computationsBD[computationId]);
      if (
        computationsBD[computationId] !== undefined &&
        computationsBD[computationId] !== null
      ) {
        delete computationsBD[computationId];
      }
    } catch (err) {
      reject(err);
    }
  });
};

const validateInput = (dsl) => {
  return new Promise((resolve, reject) => {
    try {
      const initial = dsl.metric.window.initial;
      const end = dsl.metric.window.end;

      // ISO8601 Date validation
      var iso8601 = /^(-?(?:[1-9][0-9]*)?[0-9]{4})-(1[0-2]|0[1-9])-(3[01]|0[1-9]|[12][0-9])T(2[0-3]|[01][0-9]):([0-5][0-9]):([0-5][0-9])(\\.[0-9]+)?(Z)?$/;
      var iso8601Millis = /^(-?(?:[1-9][0-9]*)?[0-9]{4})-(1[0-2]|0[1-9])-(3[01]|0[1-9]|[12][0-9])T(2[0-3]|[01][0-9]):([0-5][0-9]):([0-5][0-9])(\\.[0-9]+)?\.([0-9][0-9][0-9])(Z)?$/;

      if (Date.parse(end) - Date.parse(initial) < 0) {
        reject(new Error("End period date must be later than the initial."));
      } else if (Date.parse(new Date().toISOString()) - Date.parse(end) < 0) {
        reject(
          new Error("End period date must be earlier than the actual date.")
        );
      } else if (
        (!iso8601.test(initial) && !iso8601Millis.test(initial)) ||
        (!iso8601.test(end) && !iso8601Millis.test(end))
      ) {
        reject(new Error("Dates must fit the standard ISO 8601."));
      }
      resolve();
    } catch (err) {
      reject(err);
    }
  });
};

const getPeriods = (dsl) => {
  return new Promise((resolve, reject) => {
    try {
      const initial = dsl.metric.window.initial;
      const end = dsl.metric.window.end;
      const windowPeriod = dsl.metric.window.period;

      // Translate period string to actual days and obtain number of periods
      const periodLengths = {
        daily: 1,
        weekly: 7,
        biweekly: 14,
        monthly: 30,
        bimonthly: 60,
        annually: 365,
      };
      const periodLength = periodLengths[windowPeriod];
      if (periodLength === undefined) {
        reject(
          new Error(
            "metric.window.period must be within these: daily, weekly, biweekly, monthly, bimonthly, annually."
          )
        );
      }

      // Obtain periods
      const periods = [];

      let fromStr = initial;
      let toDate;
      let toStr;

      let keepGoing = true;
      while (keepGoing) {
        // Set from after each iteration
        if (toStr !== undefined) {
          fromStr = toStr;
        }

        // Check if to is after end of periods
        toDate = new Date(Date.parse(fromStr));
        if (toDate <= new Date(Date.parse(end))) {
          toDate = new Date(Date.parse(end));
          keepGoing = false;
        }
        toStr = toDate.toISOString();

        // Push into the array
        periods.push({ from: fromStr, to: toStr });
      }

      resolve(periods);
    } catch (err) {
      reject(err);
    }
  });
};

const calculateComputations = (dsl, periods) => {
  console.log("Extracting data ...");
  return new Promise((resolve, reject) => {
    console.log("All data extracted");
    try {
      const promises = [];
      const computations = [];

      for (const period of periods) {
        const promise = new Promise((resolve, reject) => {
          computationCalculator
            .compute(dsl, period)
            .then((result) => {
              computations.push({
                scope: dsl.metric.scope,
                period: {
                  from: period.from,
                  to: period.to,
                },
                evidences: result.evidences,
                value: result.metric,
              });

              resolve();
            })
            .catch((err) => {
              reject(err);
            });
        });

        promises.push(promise);
      }

      Promise.all(promises)
        .then(() => {
          resolve(computations);
        })
        .catch((err) => {
          reject(err);
        });
    } catch (err) {
      reject(err);
    }
  });
};

const sendError = (res, err) => {
  res.status(400);
  res.send({
    code: 400,
    message: err.message,
  });
};
