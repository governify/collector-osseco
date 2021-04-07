var valuesReader = require('./valuesReader');
global.osseco = ""
global.date = ""

module.exports.compute = (dsl, period) => {
  return new Promise((resolve, reject) => {
          
    console.log('We are computing here!');
    try {
      
      valuesReader.getValues(dsl).then(value=>{
        resolve({ evidences: [], metric: value  });
      })

      console.log(dsl);
    } catch (err) {
      reject(err);
    }
  });
};
