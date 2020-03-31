## Change Log

### v0.3.1

#### Update

- Updated npm packages and added Prettier for code formatting.
- Updated the README and removed deprecated npm scripts for deploying the Lambda to AWS.

### v0.3.0

#### Add

- Added a v0.2 create-patron API endpoint.

#### Update

- Updated error handling and log messages.

### v0.2.0

#### Add

- Added unit tests for models and an integration test for createPatron function.

### v0.1.1

#### Add

- Added the "patron_agency" parameter field to the patron data model for streaming.

### v0.1.0

#### Add

- Added the "patron_agency" parameter field to determine which patron type the Card Creator is going to create. Currently, the value of "patron_agency" will be "198" for NYC residents and is also the default. "patron_agency" will be "199" for NYS residents who live outside of the city.

### v0.0.2

#### Update

- Updated the Swagger and JSON documentations to remove "work_or_school_address" from the parameters, as we are using production Card Creator v2. This version currently does not support "work_or_school_address".

### v0.0.1

#### Update

- Updated the Swagger documentation.
- Updated the data structures of the responses.
- Updated the route for JSON swaggger documentation.
- Updated the parameters for preparing to connect to Card Creator v2.
- Updated the credentials to .env files.

#### Add

- Added the data field of "ecommunications_pref" for the patron's newsletter subscription.
- Added the data streaming after creating a patron with AWS Kinesis.
- Added the data fields of "patron_id" and "barcode" in the response.
