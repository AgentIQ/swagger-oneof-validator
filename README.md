# Swagger-oneOf-validator

"oneOf" verifies specific schema types (Message Type). This is a custom validator to accept custom "message_type" validation. (see example below)  

```
# swagger2 does not accept this
oneOf:
  - $ref: '#/components/schemas/Cat'
  - $ref: '#/components/schemas/Dog'
```

** oneOf is currently only support in swagger3, swagger3 is missing code generator
** https://swagger.io/docs/specification/data-models/oneof-anyof-allof-not/

### Installation:
Using npm:
```sh
npm install swagger-oneOf-validator --save
```
Using yarn:
```sh
yarn add swagger-oneOf-validator
```

### Usage:

First create definitions in swagger.yaml
```yaml
definitions:
  TextMessage:
    type: object
    required:
      - content
    properties:
      content:
        type: string
  AseetMessage:
    type: object
    properties:
      message_type:
        type: string
        enum:
          - asset
      asset:
        type: object
        properties:
          asset_id:
            type: integer
        required:
          - asset_id
    required:
      - asset
      - message_type

  RichTextMessage:
    type: object
    properties:
      message_type:
        type: string
        enum:
          - rich_text
      rich_text:
        type: object
        properties:
          content:
            type: string
          attachments:
            type: array
            items:
              type: object
            minItems: 1
        required:
          - content
    required:
      - rich_text
      - message_type
```

Second inport the validator and create Validator instance with your swagger.yaml path
Message definition mapping will be used to expect as oneOf in payload
and can be also nested by defining nesting parameter name in validator.validateOneOf function
result = validator.validateOneOf(definitionMapping, data, nestParameterName)
if there is errors, it will be in result object.
```js

const Validator = require('swagger-oneof-validator');
const path = require('path');
const swaggerFilePath = path.join(__dirname, '/../../../public/swagger.yaml');
const validator = new Validator(swaggerFilePath);

// mapping message_type to definitions in swagger yaml
// if there is not message_type found in structure, default definition will be used!
const messageDefinitionMapping = {
    'default': 'TextMessage',
    'rich_text': 'RichTextMessage',
    'asset': 'AseetMessage',
    'reply': 'ReplyMessage',
    'card': 'CardMessage'
};

router.post('/', (req, res, next) => {
    const result = validator.validateOneOf(
        messageDefinitionMapping,
        req.body,
        'attachments'
    );
    if (result.errors.length > 0) {
        next(result.errors);
    } else {
        res.json('Valid');
    }
});

```

Usage as a middleware for paths already defined in swagger.yaml
validator.middleware(path, method)
or 
validator.middleware(req) if where you mount the middleware matches the url path defined in swagger
```js
router.post('/', validator.middleware('/new_message_test', 'post'), (req, res, next) => {
    // your code goes here
});
```









