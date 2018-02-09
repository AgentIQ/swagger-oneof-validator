const sway = require('sway');
const helpers = require('sway/lib/helpers');

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
    _parseNestedMessages(data, messages, messageTypes, nestParameterName, path=null) {
        if (!path) {
            path = [];
        }
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
    _parseCustomMessages(data, messages, nestParameterName, path=null) {
        if (!path) {
            path = [];
        }
        messages.push({message: data, path});
        let tempPath = [];
        const messageType = data.message_type;
        if (messageType && nestParameterName
            && data[messageType] && data[messageType][nestParameterName]) {
            tempPath.push(messageType);
            let i = 0;
            data[messageType][nestParameterName].forEach(item => {
                let mergedPath = path.concat(tempPath);
            mergedPath.push(nestParameterName+'['+i+']');
            this._parseCustomMessages(item, messages, nestParameterName, mergedPath);
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
        let result;
        if (this.swaggerApi.definitions && this.swaggerApi.definitions[definitionName]) {
            result = helpers.validateAgainstSchema(
                helpers.getJSONSchemaValidator(),
                this.swaggerApi.definitions[definitionName],
                data
            );
            return result;
        }
        return {errors: [{
            code: 'INVALID_DEFINITION_ERROR',
            message: "definition '"+definitionName+"' is  invalid.",
            path: []
        }]};;
    }
    validateByDefinitionBySchema(data, schema) {
        let result;
        if (this.swaggerApi.definitions && schema) {
            result = helpers.validateAgainstSchema(
                helpers.getJSONSchemaValidator(),
                schema,
                data
            );
            return result;
        }
        return {errors: [{
            code: 'INVALID_DEFINITION_ERROR',
            message: "Definition is invalid.",
            path: []
        }]};;
    }
    validateOneOf(definitionMapping, data, nestParameterName=null) {
        const messageTypes = Object.keys(definitionMapping);
        let parsedMessages = [];
        this._parseNestedMessages(data, parsedMessages, messageTypes, nestParameterName);
        return this._validateMessagesArray(parsedMessages, definitionMapping);
    }
    customMessageValidator(data, messageSchema, nestParameterName) {
        let parsedMessages = [];
        this._parseCustomMessages(data, parsedMessages, nestParameterName);
        const errors = [];
        parsedMessages.forEach(data => {
            const {message, path} = data;
        let errorMessage = 'Message format is invalid. Reasons: Missing content,';
        errorMessage += ' missing (message_type or payload[message_type]) or having both together';
        const error = {
            code: 'INVALID_MESSAGE_FORMAT',
            message: errorMessage,
            path: path
        }
        const messageType = message.message_type;
        // check that either content or (messageType && message[messageType]) not exists
        // or all of them exists
        // it has to has only one type of message
        if (!message['content'] && !(messageType && message[messageType])) {
            errors.push(error);
        } else if(message['content'] && messageType && message[messageType]) {
            errors.push(error);
        } else {
            const result = this.validateByDefinitionBySchema(message, messageSchema);
            if (result.errors.length > 0) {
                const formatError = result.errors.map(item => {
                    item.path = path.concat(item.path);
                return item;
            });
                formatError.map(item => errors.push(item));
            }
        }
    });
        return {errors};
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
