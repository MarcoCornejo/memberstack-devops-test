// const axios = require('axios')
// const url = 'http://checkip.amazonaws.com/';

const fs = require('fs');
var path = require('path');
var csv = require("csvtojson");
let response;

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Context doc: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-context.html 
 * @param {Object} context
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 * 
 */
exports.lambdaHandler = async (event, context) => {
    try {
        var AWS = require('aws-sdk')
        AWS.config.update(
            {
                accessKeyId: "PLACE AN ACCESS KEY HERE",
                secretAccessKey: "PLACE A SECRET KEY HERE",
                region: 'PLACE YOUR REGION HERE' // e.g. us-east-1
            }
        );
        let s3 = new AWS.S3();

        const bucket = 'YOUR BUCKET NAME';
        const objectKey = 'events.csv';

        const params = {
            Bucket: bucket,
            Key: objectKey
        }

        csvFilePath = '/tmp/s3data.json';

        const readStream = await s3.getObject(params).createReadStream();
        let writeStream = fs.createWriteStream(csvFilePath);

        let jsonToUpload = await new Promise((resolve, reject) => {
            const pipe = readStream.pipe(writeStream);
            pipe.on('error', reject);
            pipe.on('close', function (err) {
                csv()
                    .fromFile(csvFilePath)
                    .then(function (jsonArrayObj) {
                        let outputJson = formatOutputJson(jsonArrayObj);
                        resolve(outputJson);
                    })
            });
        });

        params.Body = JSON.stringify(jsonToUpload)

        response = await s3.upload({
            Bucket: bucket,
            Key: 'events.json',
            Body: JSON.stringify(jsonToUpload)
        }, function (s3Err, data) {
            if (s3Err) throw s3Err
            console.log(`File uploaded successfully at ${data.Location}`)
        }).promise();
    } catch (err) {
        console.log(err);
        return err;
    }

    return response
};

function formatOutputJson(inputJson) {
    outputJson = {};

    for (index in inputJson) {
        let currentUser = inputJson[index].username;
        Object.keys(inputJson[index]).forEach(function (key) {
            if (key == 'username') {
                if (!outputJson[currentUser]) {
                    outputJson[currentUser] = {};
                }
            } else {
                if (outputJson[currentUser][key]) {
                    outputJson[currentUser][key].push(inputJson[index][key]);
                } else {
                    outputJson[currentUser][key] = [inputJson[index][key]]
                }
            }
        });
    }

    return outputJson;
}