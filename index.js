'use strict';

const server = require('./server');

server.deploy('prod').catch(err => {
  console.log(err);
});

// quit on ctrl-c when running docker in terminal
process.on('SIGINT', function onSigint () {
  console.log('Got SIGINT (aka ctrl-c in docker). Graceful shutdown ', new Date().toISOString());
  shutdown();
});

// quit properly on docker stop
process.on('SIGTERM', function onSigterm () {
  console.log('Got SIGTERM (docker container stop). Graceful shutdown ', new Date().toISOString());
  shutdown();
});

const shutdown = () => {
  server.undeploy();
};
