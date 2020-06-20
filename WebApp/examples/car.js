"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const configuration_js_1 = require("../configuration.js");
const __1 = require("../");
const events_1 = require("events");
const logger = new __1.Logger({ toConsole: false });
test();
function listen(listener) {
    listener.on('end', function ({ item, event }) {
        console.log('----->' + event + " " + item.elementId);
    });
    listener.on('all', function ({ item, event, token, execution }) {
        let object;
        if (event.startsWith('execution.'))
            object = execution;
        else
            object = item;
        console.log('----->event:' + event + ' ' + object.constructor.name);
    });
    listener.on('wait', function (object, event) {
        //        console.log('----->' + event);
    });
}
function test() {
    return __awaiter(this, void 0, void 0, function* () {
        const server = new __1.BPMNServer(configuration_js_1.configuration, logger);
        const listener = new events_1.EventEmitter();
        listen(listener);
        let response = yield server.engine.start('Buy Used Car', {}, listener);
        // let us get the items
        const items = response.items.filter(item => {
            return (item.status == 'wait');
        });
        items.forEach(item => {
            console.log(`  waiting for <${item.name}> -<${item.elementId}> id: <${item.id}> `);
        });
        console.log('Invoking Buy');
        response = yield server.engine.invoke({ instance: { id: response.execution.id }, items: { elementId: 'task_Buy' } }, { model: 'Thunderbird', needsRepairs: false, needsCleaning: false });
        console.log("Ready to drive");
        let item = response.items.filter(item => {
            return (item.name == 'Drive');
        })[0];
        console.log('item: -------------');
        console.log(item.data);
        item.data = { cost: 45000 };
        console.log('item: -------------');
        console.log(item.data);
        response = yield server.engine.invoke({ instance: { id: response.execution.id }, items: { elementId: 'task_Drive' } });
        console.log(`that is it!, process is now complete status=<${response.execution.status}>`);
    });
}
//# sourceMappingURL=car.js.map