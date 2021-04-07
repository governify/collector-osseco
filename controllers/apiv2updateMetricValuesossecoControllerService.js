"use strict";

const request = require("request");

module.exports.update = function update(req, res, next) {
  var osseco = req.osseco.value;
  var registry = "http://registry.osseco.governify.io";
  var reporter = "http://reporter.osseco.governify.io";

  var agreements = [];
  //We get all the agreements that we are going to update
  request(
    registry + "/api/v6/agreements",
    { json: true },
    (err, res2, body) => {
      if (err) {
        return console.log(err);
      }

      body.forEach((element) => {
        console.log(element.id);
        //Update all the OSSECO's agreements
        if (element.id.includes(osseco)) {
          agreements.push(element.id);
          request(reporter + "/api/v4/contracts/" + element.id + "/update");
        }
      });
      res.send(agreements.length + " agreements have been updated");
    }
  );
};
