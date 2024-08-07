## Change Log

### v0.9.0

#### Added

- Added `.nvmrc` file and pointed it to node v20.

#### Updated

- Updated ServiceObjects URL to resolve upcoming TLS issue.
- Updated QA ILS API credentials to use production credentials.
- Updated the following npm packages:
  `aws-sdk`, `axios`, `body-parser`, `express`, `jest`

#### Removed

- Removed the following npm packages:
  `babel-jest`, `request`

### v0.8.6

#### Updated

- Updated the expiration date for temporary cards from 14 to 30 days.

### v0.8.5

#### Updated

- Updated the expiration date for temporary cards from 30 to 14 days.

### v0.8.4

#### Fixed

- Fixed the logic check for passwords to check for a string that is 8 to 32 characters in length. The previous requirements were just strong encouragements for patrons to use.

### v0.8.3

#### Updated

- Updated the "pin" name attribute to "password" for v0.3 endpoints, but "pin" is still supported for legacy API calls to the endpoints. The ILS API still requires the attribute name "pin". This update changes the format of the existing 4-digit pin to 8-32 alphanumeric password.

### v0.8.2

#### Updated

- Updated npm packages to fix security issues.

### v0.8.1

#### Added

- Added a "notice preference" value in the patron data that gets sent to the ILS through the `fixedField` object. This allows users to get email notifications for their holds. At the moment, this value is dependent on the `ecommunicationsPref` flag since there is no UX for the web app. Until then, this data object is couple with the `ecommunicationsPref` value.

### v0.8.0

#### Fixed

- Fixed issue where middle names were being used as last names and the last name was completely omitted.
- Added subnets and security groups for the node-lambda deployment script.

#### Updated

- Updated the problem detail error objects for the Dependent Eligibility endpoint to distinguish between the "limit reached" and "not eligible" errors.

### v0.7.9

#### Fixed

- Fixed issue with `inUs` not being callable if there is no work address.

### v0.7.8

#### Updated

- Added more ILS Token checks to make sure there is a token in order to call the ILS API before making any calls.
- Updated the ILS Token expiration date logic.

### v0.7.7

#### Fixed

- Fixed a race condition when generating an ILS token.
- Updated ptype logic to return a temporary ptype of 7 for devices in NYS but home addresses outside of NYS.

### v0.7.6

#### Fixed

- Fixed an issue with the strToBool function.

### v0.7.5

#### Updated

- Updated how errors are handled and returned to the client. All errors are now in the Problem Detail structure which contains "status", "type", "title", "detail" for errors that are returned to the client. Internally, Error objects also contain the "message" property as well as having the option to render "message" to the client, since older clients expect that value in the returned JSON.
- Updated the IlsClient so it handles token creation rather than having the `endpoints` file generate tokens for authenticated calls. Now the token is private in that class rather than global in the app.
- Updated integration tests for the v0.3 API endpoints.
- Removed code for v0.1 and v0.2 endpoints and returned a deprecated note for those endpoints.
- Updated Swagger documentation to reflect updated valid responses and error problem detail responses.

#### Added

- Added new barcode sequence in the database for upcoming p-types.
- Added new digital p-types.

### v0.7.4

#### Added

- Added `lastName` and `firstName` request inputs for the endpoints to create a patron and to create dependent juvenile accounts. The previously used `name` is still available. There is now a function that takes in all possible values and normalizes the format to be "firstName lastName". This is to clear confusion where some clients send the `name` input as "lastName, firstName". Now there's an option to send each name individually.

### v0.7.3

#### Update

- Updated the list of p-types that are allowed to create juvenile accounts to include 50 and 51, Teen Metro and Teen NY State.
- Update the request input `name` format for juvenile accounts.

### v0.7.2

#### Update

- Updated the dependent juvenile account's name to include the parent's last name if no child last name was included.
- Adding error logging when calling the ILS API to see in AWS Cloudwatch.

### v0.7.1

#### Hotfix

- Updated the barcode to the correct seed number.

### v0.7.0

#### Add

- Added encrypted database values for QA and production.
- Added a p-type for Marli.

#### Update

- Updated the return object response for multiple address for the `/validations/address` and `/patrons` endpoints.
- Updated the `webApplicant` policy type to return standard cards if the patron is in NYS and made `email` a required field.
- Updated the Swagger docs to include new fields for the `/patrons` endpoint.
- Updated the required fields for the `webApplicant` policy so a barcode is created for those accounts.
- Updated the "simplyeJuvenile" policy type to always return a standard 3-year card.

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
