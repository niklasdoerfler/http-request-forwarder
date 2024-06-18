const express = require('express');
const http = require('http');
const dns = require('dns');

const app = express();
const port = 3000;

const forwardEndpoints = process.env.TARGET_ADDITIONAL_FORWARD_ENDPOINTS || '';

const parseEndpoints = (endpointsStr) => {
    const endpoints = [];
    if (endpointsStr) {
        endpointsStr.split(',').forEach((ep) => {
            const lastSemicolonIndex = ep.lastIndexOf(';');
            const url = ep.substring(0, lastSemicolonIndex);
            const method = ep.substring(lastSemicolonIndex + 1).toUpperCase();
            const parsedUrl = new URL(url);
            endpoints.push({
                hostname: parsedUrl.hostname,
                port: parsedUrl.port || 80,
                path: parsedUrl.pathname + parsedUrl.search,
                method,
            });
        });
    }
    return endpoints;
};

const endpointsList = parseEndpoints(forwardEndpoints);

app.get('/health', (req, res, next) => {
    const target = process.env.TARGET_HOSTS_DNS_NAME;
    if (target === undefined) {
        return next(new Error("Environment variable TARGET_HOSTS_DNS_NAME is not set"));
    }

    dns.lookup(target, { all: true }, (err, addresses) => {
        if (addresses === undefined) {
            return next(new Error("Unable to resolve hostname '" + target + "'."));
        }
        res.send(addresses);
    });
});

app.all('*', (req, res, next) => {
    dns.lookup(process.env.TARGET_HOSTS_DNS_NAME, { all: true }, (err, addresses) => {
        if (addresses === undefined) {
            return next(new Error("Unable to resolve hostname '" + process.env.TARGET_HOSTS_DNS_NAME + "'."));
        }

        const promises = [];

        addresses.forEach((address) => {
            promises.push(new Promise((resolve, reject) => {
                if (req.headers.host !== undefined) {
                    delete req.headers.host;
                }
                const options = {
                    hostname: address.address,
                    port: process.env.TARGET_HOSTS_PORT,
                    path: req.url,
                    method: req.method,
                    headers: req.headers,
                };

                console.log(
                    "Sending %s request to http://%s:%d%s with headers: %s",
                    options.method,
                    options.hostname,
                    options.port,
                    options.path,
                    JSON.stringify(options.headers)
                );

                http
                    .request(options, (resp) => {
                        const chunks = [];
                        resp.on('data', (data) => chunks.push(data));
                        resp.on('end', () => {
                            let resBody = Buffer.concat(chunks);
                            switch (resp.headers['content-type']) {
                                case 'application/json':
                                    resBody = JSON.parse(resBody);
                                    break;
                            }
                            console.log(
                                "Got response for call: http://%s:%d%s -> %d: %s",
                                options.hostname,
                                options.port,
                                options.path,
                                resp.statusCode,
                                resp.statusMessage
                            );
                            resolve({
                                ...options,
                                statusCode: resp.statusCode,
                                statusMessage: resp.statusMessage,
                                body: resBody.toString(),
                            });
                        });
                    })
                    .on('error', (err) => {
                        console.log('Error: ' + err.message);
                        resolve({
                            ...options,
                            err: err,
                        });
                    })
                    .end();
            }));
        });

        endpointsList.forEach((endpoint) => {
            promises.push(new Promise((resolve, reject) => {
                const options = {
                    hostname: endpoint.hostname,
                    port: endpoint.port,
                    path: endpoint.path,
                    method: endpoint.method,
                    headers: req.headers,
                    insecureHTTPParser: true
                };

                console.log(
                    "Sending %s request to http://%s:%d%s with headers: %s",
                    options.method,
                    options.hostname,
                    options.port,
                    options.path,
                    JSON.stringify(options.headers)
                );

                const reqForward = http.request(options, (resp) => {
                    const chunks = [];
                    resp.on('data', (data) => chunks.push(data));
                    resp.on('end', () => {
                        let resBody = Buffer.concat(chunks);
                        switch (resp.headers['content-type']) {
                            case 'application/json':
                                resBody = JSON.parse(resBody);
                                break;
                        }
                        console.log(
                            "Got response for call: http://%s:%d%s -> %d: %s",
                            options.hostname,
                            options.port,
                            options.path,
                            resp.statusCode,
                            resp.statusMessage
                        );
                        resolve({
                            ...options,
                            statusCode: resp.statusCode,
                            statusMessage: resp.statusMessage,
                            body: resBody.toString(),
                        });
                    });
                });

                reqForward.on('error', (err) => {
                    console.log('Error: ' + err.message);
                    resolve({
                        ...options,
                        err: err,
                    });
                });

                if (req.body) {
                    reqForward.write(JSON.stringify(req.body));
                }
                reqForward.end();
            }));
        });

        Promise.all(promises)
            .then((data) => {
                console.log(data);
                res.send(data);
            })
            .catch((err) => res.status(400).send(err));
    });
});

app.listen(port, '0.0.0.0', () => {
    console.log(`Listening on port ${port}...`);
});