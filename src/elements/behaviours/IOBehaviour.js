"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IOBehaviour = void 0;
const _1 = require(".");
/*
 * will prepare input at start
 * will prepare output at end
 *
 */
class IOParameter {
    constructor(type, name, value) {
        this.type = type;
        this.name = name;
        this.value = value;
    }
    isInput() { return (this.type == 'camunda:inputParameter'); }
    isOutput() { return (this.type == 'camunda:outputParameter'); }
}
class IOBehaviour extends _1.Behaviour {
    init() {
        this.parameters = [];
        var ios = this.definition['$children'];
        for (var i = 0; i < ios.length; i++) {
            var io = ios[i];
            this.parameters.push(new IOParameter(io['$type'], io['name'], io['$body']));
        }
    }
    /*
     * process input parameters here
     *
     * generate item.context.input
     *
     */
    enter(item) {
        if (!item.context.input)
            item.context.input = {};
        var hasInput = false;
        this.parameters.forEach(param => {
            if (param.isInput()) {
                /**
                 * scenario for call
                 * */
                hasInput = true;
                var val = item.token.execution.appDelegate.scopeEval(item, param.value);
                item.context.input[param.name] = val;
                item.log('...set at enter data input : input.' + param.name + ' = ' + val);
            }
        });
        if (hasInput == false) {
            /**
             * scenario for throw
             * */
            this.parameters.forEach(param => {
                if (param.isOutput()) {
                    var val = item.token.execution.appDelegate.scopeEval(item, param.value);
                    item.context.output[param.name] = val;
                    item.log('...set at enter data output : output.' + param.name + ' = ' + val);
                }
            });
        }
    }
    process(item) {
    }
    /*
     * process output parameters here
     *
     * value is an expression need to be evaluated
     *
     *      moving output into data
     *
     */
    exit(item) {
        this.parameters.forEach(param => {
            if (param.isOutput()) {
                /**
                 * scenario for call results
                 * */
                if (typeof param.value !== 'undefined' && param.value !== '') {
                    var val = item.token.execution.appDelegate.scopeEval(item, param.value);
                    item.log('...set at exit data output : data.' + param.name + ' = ' + val);
                    item.token.data[param.name] = val;
                }
                else
                    item.token.data[param.name] = item.context.output;
            }
        });
    }
    describe() {
        var input = '';
        var output = '';
        this.parameters.forEach(param => {
            if (param.isOutput()) {
                output += param.name + '=' + param.value;
            }
            else
                input += param.name + '=' + param.value;
        });
        return [['Input', input], ['output', output]];
    }
}
exports.IOBehaviour = IOBehaviour;
//# sourceMappingURL=IOBehaviour.js.map