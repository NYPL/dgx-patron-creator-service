## Change Log

### v0.7.0

#### Add

- Added encrypted database values for QA and production.

#### Update

- Updated the return object response for multiple address for the `validations/address` and `patron` endpoints.

### v0.6.0

#### Add

- Added endpoint `validations/address` for API V0.3.
- Added a request flag for terms of condition acceptance input.
- Added a request flag for the age gate input for "simplye" policy types.

#### Update

- Updated endpoint `/patrons` to use `workAddress` and to use the logic for creating the right card for API V0.3.
- Updated the address validations to include a work address as well as implementing validation through Service Objects.
- Updated some of the business logic surrounding the three different policies that can be used.
- Updated the response objects returned for the v0.3 API endpoints to be more consistent.
- Updated the README to reflect that the v0.3 endpoints are stable and linked to further documentation in the wiki for this project.
- Updated the patron data object that gets sent to the `NewPatron` Kinesis stream for successful patron creation requests.
- Allow temporary and older accounts with 7-digit barcodes to return a valid error response when checking for eligibility to create dependent juvenile accounts.

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
- Added an Address Validation API controller but it's not complete as the Service Objects API still needs to be implemented.
- Added tests to cover all of the added code.
- Removed unnecessary npm packages and updated packages to remove security issues found through `npm audit`.
- Updated encrypted credentials for QA and production for necessary third-party services.

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
