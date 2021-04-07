"use strict";

const fs = require("fs");
var path = require("path");
const axios = require("axios");

var OSSECO_URL;

global.metrics = new Map();
global.temp = new Map();
global.osseco = "";
module.exports = {
  getValues: getValues,
  resolveTerm: resolveTerm,
  extractData: extractData,
};

async function getValues(measure) {
  console.log("Getting values of:");
  console.log(typeof measure);

  console.log(measure.metric.osseco);
  OSSECO_URL =
    "https://gessi-sw.essi.upc.edu/PLATEOSSRESTServer/bayesian/plateossplatform/" +
    measure.metric.osseco.toLocaleLowerCase();
  console.log("global.metrics: " + JSON.stringify(global.metrics));
  return new Promise(async (resolve, reject) => {
    const bayesian = "bayesian";
    var name = measure.metric.id;
    var objetive;
    var value;
    var term;
    var orTerms;
    console.log("Checking: " + name);
    // Objetive
    if (name.toLocaleLowerCase().includes("obj")) {
      objetive = measure.metric.objetive;

      console.log("Objetive:" + objetive);

      value = 1;
      // We get the elements between parentheses
      var regExp = /\(([^)]+)\)/;
      var matches = regExp.exec(objetive);
      if (matches != null) {
        var elemetBefore = objetive.split(matches[1])[0];
        // We check if there is a NOT
        if (elemetBefore.includes("NOT (") || elemetBefore.includes("NOT(")) {
          value = await splitter(matches[1], true);
        } else {
          value = await splitter(matches[1], false);
        }
      } else {
        value = await splitter(objetive, false);
        // Values
      }
    } else {
      value = global.metrics[name];
    }

    resolve(value);
  });
}

async function resolveTerm(terms) {
  return new Promise(function (resolve, reject) {
    var term;
    var number;
    console.log("Calculating: " + terms);
    if (terms.includes(" OR ")) {
      console.log("Cheking OR terms");
      var orTerms = terms.split(" OR ");
      for (let index = 0; index < orTerms.length; index++) {
        const termsOr = orTerms[index];
        console.log("Resolving: " + termsOr);
        resolveTerm(termsOr).then((res) => {
          if (res) {
            resolve(true);
          } else {
            resolve(false);
          }
        });
      }
    } else if (terms.includes(">=")) {
      term = terms.split(">=")[0].trim().replace("(", "").replace(")", "");
      number = terms.split(">=")[1];

      console.log("global.metrics: ");
      console.log(global.metrics);
      console.log("Term: " + term);
      console.log("test: " + global.metrics[term] + ">=" + number);
      console.log(global.metrics[term] >= number.trim());

      resolve(global.metrics[term] >= number.trim());
    } else if (terms.includes("<=")) {
      term = terms.split("<=")[0].trim().replace("(", "").replace(")", "");
      number = terms.split("<=")[1];

      console.log("global.metrics: ");
      console.log(global.metrics);
      console.log("Term: " + term);
      console.log("test: " + global.metrics[term] + "<=" + number);
      console.log(global.metrics[term] <= number.trim());

      resolve(global.metrics[term] <= number.trim());
    } else if (terms.includes(">")) {
      term = terms.split(">")[0].trim().replace("(", "").replace(")", "");
      number = terms.split(">")[1];

      console.log("global.metrics: ");
      console.log(global.metrics);
      console.log("Term: " + term);
      console.log("test: " + global.metrics[term] + ">" + number.trim());
      console.log(global.metrics[term] > number.trim());

      resolve(global.metrics[term] > number.trim());
    } else if (terms.includes("<")) {
      term = terms.split("<")[0].trim().replace("(", "").replace(")", "");
      number = terms.split("<")[1].trim();

      console.log("global.metrics: ");
      console.log(global.metrics);
      console.log("Term: " + term);
      console.log("test: " + global.metrics[term] + "<" + number);
      console.log(global.metrics[term] < number.trim());

      resolve(global.metrics[term] < number.trim());
    }
  });
}

async function splitter(objetive, isNegated) {
  if (!isNegated) {
    var value = 1;
  } else {
    var value = 0;
  }

  if (objetive.includes(" AND ")) {
    var terms = objetive.split(" AND ");
  } else {
    var terms = [];
    terms.push(objetive);
  }
  console.log("Resolve: " + terms);
  for (let index = 0; index < terms.length; index++) {
    const element = terms[index];
    var finish = false;
    await resolveTerm(element).then((res) => {
      if (!isNegated) {
        if (!res) {
          value = 0;
          finish = true;
        }
      } else {
        if (!res) {
          value = 1;
          finish = true;
        }
      }
    });
    if (finish) {
      break;
    }
  }

  return value;
}

function diff_hours(dt2, dt1) {
  if (dt2 != undefined) {
    var diff = (dt2.getTime() - dt1.getTime()) / 1000;
    diff /= 60 * 60;
    return Math.abs(Math.round(diff));
  } else {
    return 3;
  }
}

async function extractData(dsl) {
  var osseco = dsl.metric.osseco;
  var now = new Date();

  console.log("Diff hour:");
  console.log(diff_hours(global.temp[osseco], now));
  if (diff_hours(global.temp[osseco], now) > 2) {
    global.temp[osseco] = now;
    console.log("Calculating matrics for " + osseco);
    global.metrics = new Map();
    OSSECO_URL =
      "https://gessi-sw.essi.upc.edu/PLATEOSSRESTServer/bayesian/plateossplatform/" +
      osseco.toLocaleLowerCase();
    const response = await axios.get(OSSECO_URL);
    const data = response.data;
    var values = data.QuESo_KHIs;

    for (let index = 0; index < values.length; index++) {
      const element = values[index];
      var measures = element.Measures;
      var name = element.KQI;
      var KQIData = element.KQIData.States;
      for (let index = 0; index < KQIData.length; index++) {
        const state = KQIData[index];
        var kqi_name = name + "_BAYESIAN_" + state.State;
        kqi_name = kqi_name.toLocaleUpperCase();
        global.metrics[kqi_name] = Number(state.Value);
      }

      for (let index = 0; index < measures.length; index++) {
        const measure = measures[index];

        var name = measure.Measure;

        var rawData = measure.RawData.Data;

        if (rawData == undefined) {
          rawData = measure.RawData.data;
        }
        name = name + "_absolut";
        name = name.toLocaleUpperCase();
        // Ignore it if it's already been extracted
        if (!Object.keys(global.metrics).includes(name)) {
          global.metrics[name] = Number(rawData[rawData.length - 1].Value);

          console.log(measure.Measure);
          var bayesianData = measure.BayesianData;
          if (bayesianData == undefined) {
            bayesianData = measure.BayesianData0;
          }
          if (bayesianData == undefined) {
            bayesianData = measure.bayesianData;
          }
          var states = bayesianData.States;
          if (states != undefined) {
            states.forEach((state) => {
              var bayesianName = measure.Measure + "_bayesian_" + state.State;
              bayesianName = bayesianName.toLocaleUpperCase();
              var value = state.Value;
              global.metrics[bayesianName] = Number(value);
            });
          }
        }
      }
    }

    console.log(global.metrics);
    console.log("All metrics calculated");
    return global.metrics;
  } else {
    console.log("The metrics have already been calculated ");
  }
}
