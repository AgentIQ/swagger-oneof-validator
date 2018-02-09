### Custom Validator

```js

const Validator = require('swagger-oneof-validator');
const path = require('path');
const swaggerFilePath = path.join(__dirname, '/../../../public/swagger.yaml');
const validator = new Validator(swaggerFilePath);



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









