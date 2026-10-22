# http-request-forwarder

This incredibly simple script provides an HTTP server used to forward requests to one or more servers. Optionally, set `TARGET_HOSTS_DNS_NAME` to a DNS name; for each IP address it resolves to, the script issues a request on the port defined in `TARGET_HOSTS_PORT`, using the original request's method and path.

Use case for this is to forward a http trigger to all instances of a deployment in a kubernetes cluster in parallel. The idea is to use a headless service for this case to retrieve all pods ip addresses by querying the hostname of this headless service.

You can also specify `TARGET_ADDITIONAL_FORWARD_ENDPOINTS` as a comma-separated list of URL and method combinations, such as `http://your-endpoint:1234/test;POST`. These endpoints are used alongside the DNS target when both are configured, or on their own when `TARGET_HOSTS_DNS_NAME` is omitted. At least one forwarding target must be configured.

