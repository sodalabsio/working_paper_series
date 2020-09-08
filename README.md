## Working Paper Series 🥤📑

Repository for the SoDa Working paper series.

## Contents
- `sodalabs.io`: Code for the SoDa WP series [website](http://sodalabs.io.s3-website-ap-southeast-2.amazonaws.com/). The file `sodalabs.io/metadata.json` contains all the working paper meta-data.
- `soda-wps`: Code for simulating [directory listing](http://soda-wps.s3-website-ap-southeast-2.amazonaws.com/) on S3 as per RePEc's [documentation](https://ideas.repec.org/t/httpserver.html).
- `uploadWorkingPaper`: AWS Lambda function which performs all the post-processing and serves as the backend. Contains all project dependencies.
- `wkhtmltopdf`: AWS Lambda layer for binaries required by the `PyPDF2` package. `PyPDF2` is used by `uploadWorkingPaper` for HTML to PDF conversion.
- `api-gateway.md`: Documentation for configuring an AWS API Gateway endpoint

## References
- [RePEc step-by-step tutorial](https://ideas.repec.org/stepbystep.html)