## Change Log

### v0.5.0

#### Add

- Added endpoints `/validations/username`, `/patrons/dependent-eligibility`, `/patrons/dependents`, and `/patrons` all under the v0.3 version.
- Added a Postgres database connection to create barcodes and associate it with a new account when its sent to the ILS.
- Added a Lunh algorithm helper file to create valid barcodes.
- Added a v0.3 models folder with models for Address, Barcode, Card, and Policy. These are needed to create new and different types of patrons in the ILS.
- Added a v0.3 controllers folder with different types of API helper files. The main controller file is `/api/controllers/v0.3/endpoints` which supports all the endpoints under v0.3.
- Added an IlsClient controller to call the ILS to create, find, and update patrons.
- Added a Dependent Account API controller to check for a patron's eligibility to create dependent juvenile cards and to create dependent accounts.
- Added a Username Validation API controller to find a patron by username in the ILS and return whether that username is valid and available in the ILS.
- Added an Address Validation API controller but not it's not complete as the Service Objects API still needs to be implemented.
- Added test to cover all of the added code.

### v0.4.0

#### Add

- Moved the dxg-validations-service endpoints to this service but kept them at the v0.1 version to be backwards compatible. The endpoints still hit the card-creator API but this will change later for v0.2.
- Added unit and integration tests for the validation endpoints for valid responses from the Card Creator.
- Updated the Swagger documentation to include the Validations service's endpoints as both yaml and JSON.

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
