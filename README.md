# http-request-forwarder

This incredibly simple script provides a HTTP server used to forward the request to one or more servers. For this you need to provide a DNS name in the env variable `TARGET_HOSTS_DNS_NAME`. For each ip address to which this hostname resolves, this script issues a request on the port defined in `TARGET_HOSTS_PORT` and the given method and path from the original request.

Use case for this is to forward a http trigger to all instances of a deployment in a kubernetes cluster in parallel. The idea is to use a headless service for this case to retrieve all pods ip addresses by querying the hostname of this headless service.

Additionally, you can specify the env variable `TARGET_ADDITIONAL_FORWARD_ENDPOINTS` to add additional endpoints, to which the request should be forwarded. It accepts a comma separated list of URL and method combinations like `http://your-endpoint:1234/test;POST`.

