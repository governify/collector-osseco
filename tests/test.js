var assert = require('assert');
var request = require('request');
var server = require('../server');

let computationEP;

describe('Array', function () {
    before((done) => {
        initializeDataAndServer(done);
    });

    describe('#apiRestRequestControllersTest()', function () {
        apiRestRequestControllersTest();
    });

    /*  If you build any cache  when running the test run it twice to cover more code
    describe('#apiRestRequestControllersTestCached()', function () {
      apiRestRequestControllersTest();
    });*/

    after((done) => {
        server.undeploy(done);
    });
});

function apiRestRequestControllersTest() {
    it('should respond with 201 Created on POST and have computation in body', function (done) {
        try {
            const options = {
                url: 'http://localhost:8081/api/v2/computations',
                json: postData1,
                headers: {
                    'User-Agent': 'request',
                }
            };
            request.post(options, (err, res, body) => {
                if (err) {
                    assert.fail("Error on request");
                }
                assert.strictEqual(err, null);
                assert.strictEqual(res.statusCode, 201);
                assert.notStrictEqual(undefined, body.computation);
                assert.strictEqual(typeof '', typeof body.computation);
                computationEP = body.computation;
                done();
            });
        } catch (err) {
            assert.fail("Error when sending request");
        }
    });

    it('should respond with 202 or 200 OK on get computation and return correct metric value', function (done) {
        try {
            assert.notStrictEqual(undefined, computationEP);

            getComputationV2('http://localhost:8081' + computationEP, 20000).then(computations => {
                try {
                    assert.deepStrictEqual(resData1, computations);
                    done();
                } catch (err) {
                    assert.fail(err);
                }
            }).catch(err => {
                assert.fail(err);
            });
        } catch (err) {
            assert.fail("Error when sending request");
        }
    });
}

const initializeDataAndServer = (done) => {
    // Data for tests
    postData1 = {
        "metric": {
            "computing": "string",
            "element": "string",
            "event": {},
            "scope": {},
            "window": {
                "initial": "2019-01-01T12:00:00.000Z",
                "period": "daily",
                "type": "string",
                "end": "2019-01-04T15:00:00.000Z"
            }
        },
        "config": {}
    }

    resData1 = [
            {
                "scope": {},
                "period": {
                    "from": "2019-01-01T12:00:00.000Z",
                    "to": "2019-01-02T12:00:00.000Z"
                },
                "evidences": [
                    {},
                    {}
                ],
                "value": 100
            },
            {
                "scope": {},
                "period": {
                    "from": "2019-01-02T12:00:00.000Z",
                    "to": "2019-01-03T12:00:00.000Z"
                },
                "evidences": [
                    {},
                    {}
                ],
                "value": 100
            },
            {
                "scope": {},
                "period": {
                    "from": "2019-01-03T12:00:00.000Z",
                    "to": "2019-01-04T12:00:00.000Z"
                },
                "evidences": [
                    {},
                    {}
                ],
                "value": 100
            },
            {
                "scope": {},
                "period": {
                    "from": "2019-01-04T12:00:00.000Z",
                    "to": "2019-01-04T15:00:00.000Z"
                },
                "evidences": [
                    {},
                    {}
                ],
                "value": 100
            }
        ]
    
    // Server initialization
    server.deploy('test').then(() => {
        done();
    }).catch((err) => {
        console.log(err);
        done();
    });
    
}

// Auxiliary
function getComputationV2(computationURL, ttl) {
    return new Promise((resolve, reject) => {
        try {
            if (ttl < 0)
                reject(new Error('Retries time surpased TTL.'));

            let realTimeout = 100; //Minimum = firstTimeout
            let firstTimeout = 50;
            let options = {
                json: true,
                url: computationURL,
                headers: {
                    'User-Agent': 'request'
                }
            };

            setTimeout(() => {
                request(options, (err, res, body) => {
                    if (err) {
                        reject(err);
                    }
                    if (res.statusCode == '202') {
                        setTimeout(() => {
                            getComputationV2(computationURL, ttl - realTimeout).then(response => {
                                resolve(response);
                            }).catch(err => {
                                reject(err);
                            });
                        }, realTimeout - firstTimeout);
                    } else if (res.statusCode == '200')
                        resolve(body.computations);
                    else
                        reject(new Error("Error when obtaining computation - " + res.statusMessage));
                });
            }, firstTimeout);
        } catch (err) {
            reject(err);
        }
    });
}