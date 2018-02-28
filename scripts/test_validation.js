const Validator = require('../index'); // swagger-oneof-validator');
const path = require('path');
const swaggerFilePath = path.join('/Users/slaven/agentiq/ai-manager-backend',
				  '/public/swagger.json');
const validator = new Validator(swaggerFilePath);
const fs = require('fs');
var argv = require('minimist')(process.argv.slice(2));

console.dir(argv);
// mapping message_type to definitions in swagger yaml
// if there is not message_type found in structure, default definition will be used!

//const messageDefinitionMapping = {
//    'default': 'TextMessage',
//    'rich_text': 'RichTextMessage',
//    'asset': 'AseetMessage',
//    'reply': 'ReplyMessage',
//    'card': 'CardMessage'
//};

//var contents = fs.readFileSync(argv.input);
//var jsonContent = JSON.parse(contents);
jsonContent = JSON.parse(`{
        "payload": {
          "message_type": "card",
          "cards": {
            "title": "MLV-234",
            "description": "MLV-234 is the latest product that supports x, y, and z",
            "imageUrl": "http://test.com/mlv-234.jpg",
            "attachments": [
              {
                "message_type": "reply",
                "reply": {
                  "content": "See more details",
                  "url": "http://test.com/products/mlv-234.html"
                }
              },
              {
                "message_type": "reply",
                "reply": {
                  "content": "Go to website",
                  "url": "http://test.com"
                }
              }
            ]
          }
        }
    }`);

//router.post('/', (req, res, next) => {
const result = validator.validateOneOf(
    'Message',
    'message_type',
    // messageDefinitionMapping,
    jsonContent.payload
    //  req.body,
    // 'attachments'
);
if (result.errors.length > 0) {
    console.log(result.errors);
} else {
    console.log('Valid');
}
// });
