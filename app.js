const express = require('express');
const http = require("http");

const dns = require('dns');
const app = express();
const port = 3000;


app.get('/health', (req, res, next) => {
    const target = process.env.TARGET_HOSTS_DNS_NAME;
    if (target == undefined) {
        return next(new Error("Environment variable TARGET_HOSTS_DNS_NAME is not set"))
    }

    dns.lookup(target, { all: true }, (err, addresses) => {
        if (addresses == undefined) {
            return next(new Error("Unable to resolve hostname '" + target + "'."));
        }
        res.send(addresses)
    })
})

app.all('*', (req, res, next) => {
    dns.lookup(process.env.TARGET_HOSTS_DNS_NAME, { all: true }, (err, addresses) => {
        if (addresses == undefined) {
            return next(new Error("Unable to resolve hostname '" + process.env.TARGET_HOSTS_DNS_NAME + "'."));
        }

        const promises = [];

        addresses.forEach(address => {
            promises.push(new Promise((res, rej) => {
                if (req.headers.host != undefined) {
                    delete req.headers.host;
                }
                const options = {
                    hostname: address.address,
                    port: process.env.TARGET_HOSTS_PORT,
                    path: req.url,
                    method: req.method,
                    headers: req.headers
                }

                console.log("Sending %s request to http://%s:%d%s with headers: %s", options.method, options.hostname, options.port, options.path, JSON.stringify(options.headers));

                http
                    .request(options, resp => {
                        // log the data
                        resp.once("data", d => {
                            console.log("Got response for call: http://%s:%d%s -> %d: %s", options.hostname, options.port, options.path, resp.statusCode, resp.statusMessage);
                            res({
                                ...options,
                                statusCode: resp.statusCode,
                                statusMessage: resp.statusMessage
                            })
                        });
                    })
                    .on("error", err => {
                        console.log("Error: " + err.message);
                        // Promise.all does not work with errors
                        res({
                            ...options,
                            err: err
                        })
                    }).end();
            }));
        });

        Promise
            .all(promises)
            .then((data) => {
                console.log(data)
                res.send(data);
            }).catch(err => res.status(400).send(err));
    });
})

app.listen(port, '0.0.0.0', () => {
    console.log(`Listening on port ${port}...`)
})