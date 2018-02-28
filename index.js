const sway = require('sway');
const helpers = require('sway/lib/helpers');
const _ = require('lodash');

class MessageValidator {
    constructor(filePath) {
        const options = {
            definition: filePath
        };
        this.swaggerApi = this._getSwaggerApi(options);
    }
    _getSwaggerApi(options) {
        let swaggerApi;
        sway.create(options).then(api => {
            swaggerApi = api;
        }).catch(err => {
            throw err;
        });
        while (swaggerApi === undefined) {
            require('deasync').sleep(100);
        }
        return swaggerApi;
    }
    _resolveReference(messageReference) {
        if (messageReference.indexOf('#') >= 0) {
            return messageReference.split('/').slice(-1)[0];
        }
        return messageReference;
    }
    _parseNestedMessages(data, messages, messageTypes, nestParameterName, path=null) {
        if (!path) {
            path = [];
        }
        console.log(data);
        console.log(messageTypes);
        messages.push({message: data, path});
        let tempPath = [];
        const messageType = data.message_type;
        if (messageType && nestParameterName && messageTypes.indexOf(messageType) > -1
            && data[messageType] && data[messageType][nestParameterName]) {
            tempPath.push(messageType);
            let i = 0;
            data[messageType][nestParameterName].forEach(item => {
                let mergedPath = path.concat(tempPath);
                mergedPath.push(nestParameterName+'['+i+']');
                this._parseNestedMessages(item, messages, messageTypes, nestParameterName, mergedPath);
                i++;
            });
        }
    }
    _validateMessagesArray(messages, definitionMapping) {
        const errors = [];
        messages.forEach(data => {
            const {message, path} = data;
            const messageType = message.message_type;
            const definitionName = messageType ? definitionMapping[messageType] : definitionMapping['default'];
            console.dir('@@' + definitionName + '@@' + messageType);
            if (definitionName) {
                const result = this.validateByDefinition(definitionName, message);
                if (result.errors.length > 0) {
                    const formatError = result.errors.map(item => {
                        item.path = path.concat(item.path);
                        return item;
                    });
                    formatError.map(item => errors.push(item));
                }
            } else {
                errors.push({
                    code: 'INVALID_MESSAGE_TYPE',
                    message: "Message type: '" + messageType + "' is invalid",
                    path: path
                });
            }
        });
        return {errors};
    }
    validateByPath(req, path=null, method=null) {
        let operation;
        if (path && method && typeof path === 'string' && typeof method === 'string') {
            operation = this.swaggerApi.getOperation(path, method);
        } else {
            path = req.url;
            method = req.method.toLowerCase();
            operation = this.swaggerApi.getOperation(req);
        }
        if (operation) {
            const result = operation.validateRequest(req);
            return result;
        } else {
            return {errors: [{
                code: 'INVALID_PATH_OR_REQ_ERROR',
                message: "Path '"+path+"' or method '"+method+"' is  invalid.",
                path: []
            }]};
        }
    }
    validateByDefinition(definitionName, data) {
        console.dir(definitionName);
        console.dir(data);
        console.dir('##' + definitionName + '##' + data);
        console.dir(this.swaggerApi.definitionFullyResolved);
        console.dir(definitionName + '()' + JSON.stringify(this.swaggerApi.definitionFullyResolved.definitions[definitionName]));
        let result;
        if (this.swaggerApi.definitions && this.swaggerApi.definitionFullyResolved.definitions[definitionName]) {
            while (true) {
                // let noCirculars = _.cloneDeep(this.swaggerApi);
                // helpers.removeCirculars(noCirculars.definitions);
                // result = helpers.validateAgainstSchema(helpers.getJSONSchemaValidator(), noCirculars, data);
                result = helpers.validateAgainstSchema(
                    helpers.getJSONSchemaValidator(),
                    this.swaggerApi.definitionFullyResolved.definitions[definitionName],
                    data
                );
            if (result.errors.length > 0) {
                console.log('Result:' + JSON.stringify(result));
                if (result.errors[0].code === 'UNRESOLVABLE_REFERENCE') {
                    console.log(result.errors[0].path);
                }
            }
            break;
        }
            return result;
        }
        return {errors: [{
            code: 'INVALID_DEFINITION_ERROR',
            message: "definition '"+definitionName+"' is  invalid.",
            path: []
        }]};;
    }
    validateOneOf(className, fieldName, data, nestParameterName=null) {
        console.log(className);
        console.log(fieldName);
        console.log('99' + JSON.stringify(this.swaggerApi.definitionFullyResolved.definitions.CardMessageType));
        console.log('888' + JSON.stringify(this.swaggerApi.definitionFullyResolved.definitions.Message, null, ' '));
        const classDefinition = this.swaggerApi.definitions[className];
        console.log(classDefinition);
        // console.log('&&' + JSON.stringify(classDefinition.properties))
        // console.log('**' + JSON.stringify(classDefinition.properties[fieldName].enum))
        const messageTypes = classDefinition.properties[fieldName].enum
        let definitionMapping = {}
        for (let i = 0; i < messageTypes.length; i++) {
            console.log(messageTypes[i]);
            // console.log()
            // definitionMapping[messageTypes[i]] = classDefinition.properties[messageTypes[i]]['$ref'];
            let messageDefinition = this._resolveReference(classDefinition.properties[messageTypes[i]]['$ref']);
            definitionMapping[messageTypes[i]] = messageDefinition;
            console.log('$$' + JSON.stringify(classDefinition.properties[messageTypes[i]]));
        }

        console.log('^^' + JSON.stringify(definitionMapping));
        // const messageTypes = Object.keys(definitionMapping);
        let parsedMessages = [];
        this._parseNestedMessages(data, parsedMessages, messageTypes, nestParameterName);
        return this._validateMessagesArray(parsedMessages, definitionMapping);
    }
    middleware(path, method) {
        return (req, res, next) => {
            let result;
            if (path && method && typeof path === 'string' && typeof method === 'string') {
                result = this.validateByPath(req, path, method);
            } else {
                result = this.validateByPath(req);
            }
            if (result.errors.length > 0) {
                return next(result.errors);
            }
            return next();
        };
    }
}


module.exports = MessageValidator;
;