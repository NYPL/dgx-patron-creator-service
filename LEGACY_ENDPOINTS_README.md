# v0.1 & v0.2

This README is for the app version under `0.4.0` and for endpoints `/v0.1` and `/v0.2`. These endpoints are deprecated as the v0.1 endpoints depended on the NYPL Simplified Card Creator API which will be deprecated, and as the v0.2 endpoint was a proof-of-concept, not used in production, and used an older ILS API version.

For the v0.1 endpoints, the Library Card app form on NYPL's website will fire a POST request to the service after it has been submitted. The service will then take the information and fire another POST request to NYPL Simplified's Card Creator API. Finally, it will return the results based on the response from the Card Creator API.

The Card Creator's documentation can be found [here](https://github.com/NYPL-Simplified/card-creator).

_Please contact [NYPL's Simplified Card Creator team](https://github.com/NYPL-Simplified/card-creator) if you need the credentials to the Card Creator API._
_Please contact an NYPL engineer to get AWS credentials for NYPL's AWS accounts._

## Credentials

You need credentials for making a successful API call to NYPL's Simplified Card Creator. You should set the credentials in the `.env` file. For example,

```bash
CARD_CREATOR_USERNAME=username
CARD_CREATOR_PASSWORD=password
```

_Please contact [NYPL's Simplified Card Creator team](https://github.com/NYPL-Simplified/card-creator) if you need the credentials to the Card Creator API._

All credentials that are used as environment variables need to be encrypted through the AWS KMS service. See [NYPL Engineering General](https://github.com/NYPL/engineering-general/blob/8afa65f3af28654159f11b5b1ac91dde5812153e/security/secrets.md) for more details.

## Credentials

You need credentials for making a successful API call to NYPL's Platform API where the Card Creator API endpoints are located. You should set the credentials in the `.env` file. For example,

```bash
CARD_CREATOR_USERNAME=username
CARD_CREATOR_PASSWORD=password
```

_Please contact [NYPL's Simplified Card Creator team](https://github.com/NYPL-Simplified/card-creator) if you need the credentials to the Card Creator API._

All credentials that are used as environment variables need to be encrypted through the AWS KMS service. See [NYPL Engineering General](https://github.com/NYPL/engineering-general/blob/8afa65f3af28654159f11b5b1ac91dde5812153e/security/secrets.md) for more details.

## API Endpoints

#### 1. Create a Patron `/api/v0.1/patrons` - POST

With valid credentials, a POST request to `/api/v0.1/patrons` will create a new patron using the NYPL Card Creator API.

The request data format should be in JSON with required fields of "name", "dateOfBirth", "address", "username", and "pin". The username must be unique. Example data for API v0.1:

```javascript
{
  "simplePatron": {
    "name": "Tom Nook",
    "dateOfBirth": "05/30/1980",
    "email": "tomnook@ac.com",
    "address": {
      "line_1": "1111 1st St.",
      "line_2": "",
      "city": "Woodside",
      "state": "NY",
      "zip": 11377
    },
    "username": "tomnook42",
    "pin": "1234",
    "ecommunications_pref": true,
    "policy_type": "web_applicant",
    "patron_agency": "198"
  }
}
```

_Notice: `ecommunications_pref` takes a boolean type of value from "Get a Library Card" form, but it will output a string as `s` or `-` based on `true` or `false`. The reason is that the Card Creator API takes `s` or `-`._

_Notice: `patron_agency` is for telling the Card Creator which patron type is going to be created. While `198` is default and for NYC residents, `199` is for NYS residents who do not live in NYC. Other patron types are also available. See your ILS for details._

Example of a successful JSON response from API v0.1:

```javascript
{
  "data": {
    simplePatron: {
      "status_code_from_card_creator": 200,
      "type": "card-granted",
      "username": "tomnook42",
      "temporary": true,
      "patron_id": "6367028",
      "barcode": "6367028",
      "message": "Your library card is temporary because your address could not be verified. Visit your local NYPL branch within 30 days to upgrade to a standard card.",
      "detail": {},
    },
    patron: {}
  },
  "count": 1
}
```

Three kinds of error messages could be returned from the Card Creator API.

| type                         | status | title                         | detail                                                                                  | debug_message |
| ---------------------------- | :----: | ----------------------------- | --------------------------------------------------------------------------------------- | ------------- |
| 'remote-integration-failure' |  502   | 'Third-party service failed.' | 'The library could not complete your request because a third-party service has failed.' | -             |
| 'invalid-request'            |  400   | 'Invalid request.'            | 'Valid request parameters are required.'                                                | Varies        |
| 'no-available-barcodes'      |  422   | 'No available barcodes.'      | 'There are no barcodes currently available.'                                            | -             |

#### 2. User Name Validation `api/v0.1/validations/username` - POST

With a valid credential, a POST request to `/api/v0.1/validations/username` will run validation for a patron's username using the NYPL Card Creator API.

The request data format should be in JSON with the key "username". For instance,

```javascript
{ "username": "tomnook42" }
```

A successful JSON response example:

```javascript
{
  "data": {
    "status_code_from_card_creator": 200,
    "valid": true,
    "type": "available-username",
    "card_type": "standard",
    "message": "This username is available.",
    "detail": {}
  }
}
```

#### 3. Address Validation `/api/v0.1/validations/address` - POST

Make a POST request to `/api/v0.1/validations/address` for address validation using the NYPL Card Creator API.

The request data format should be in JSON with the key "address". For instance,

```javascript
{
  "address" : {
    "line_1" : "1111 1st St.",
    "city" : "Woodside",
    "state" : "NY",
    "zip" : "11377"
  },
  "is_work_or_school_address" : true
}
```

A successful JSON response example:

```javascript
{
  "data": {
    "status_code_from_card_creator": 200,
    "valid": true,
    "type": "valid-address",
    "card_type": "standard",
    "message": "This valid address will result in a standard library card.",
    "detail": {},
    "address": {
      "line_1": "1111 1st St.",
      "line_2": "",
      "city": "Woodside",
      "county": "New York",
      "state": "NY",
      "zip": "11377-2600",
      "is_residential": false
    },
    "original_address": {
      "line_1": "1123 fake Street",
      "line_2": "",
      "city": "Woodside",
      "county": "",
      "state": "NY",
      "zip": "11377",
      "is_residential": null
    }
  }
}
```

#### 4. v0.2 Create a Patron `/api/v0.2/patrons` - POST

This endpoint uses the ILS to create a patron but was set up a POC and not used in production.
