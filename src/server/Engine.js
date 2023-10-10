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
exports.Engine = void 0;
const __1 = require("../..");
const ServerComponent_1 = require("../server/ServerComponent");
class Engine extends ServerComponent_1.ServerComponent {
    constructor(server) {
        super(server);
    }
    /**
     *	loads a definitions  and start execution
     *
     * @param name		name of the process to start
     * @param data		input data
     * @param startNodeId	in process has multiple start node; you need to specify which one
     */
    start(name, data = {}, startNodeId = null, userId = null, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.log(`Action:engine.start ${name}`);
            const definitions = this.definitions;
            const source = yield definitions.getSource(name);
            const execution = new __1.Execution(this.server, name, source);
            execution.userId = userId;
            // new dataStore for every execution to be monitored 
            /* const newDataStore =new DataStore(this.server);
            this.server.dataStore = newDataStore;
    
            newDataStore.monitorExecution(execution); */
            this.cache.add(execution);
            yield this.lock(execution.instance.id);
            execution.worker = execution.execute(startNodeId, data, options);
            if (options['noWait'] == true) {
                execution.worker.then(obj => {
                    this.logger.log('after worker is done releasing ..' + execution.instance.id);
                    this.release(execution.instance.id);
                });
                return execution;
            }
            else {
                const waiter = yield execution.worker;
                yield this.release(execution.instance.id);
                this.logger.log(`.engine.start ended for ${name}`);
                return execution;
            }
        });
    }
    /**
     * restores an instance into memeory or provides you access to a running instance
     *
     * this will also resume execution
     *
     * @param instanceQuery		criteria to fetch the instance
     *
     * query example:	{ id: instanceId}
     *					{ data: {caseId: 1005}}
     *					{ items.item.id : 'abcc111322'}
     *					{ items.item.itemKey : 'businesskey here'}
     *
     */
    get(instanceQuery) {
        return __awaiter(this, void 0, void 0, function* () {
            const instance = yield this.restore(instanceQuery);
            yield this.release(instance.id);
            return instance;
        });
    }
    /**
        lock instance
    */
    lock(instanceId) {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.log('===============locking ..' + instanceId);
            yield this.server.dataStore.locker.lock(instanceId);
        });
    }
    /**
        release instance lock
    */
    release(instanceId) {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.log('---------------releasing ..' + instanceId);
            yield this.server.dataStore.locker.release(instanceId);
        });
    }
    /***
        Loads instance into memory for purpose of execution
        Locks instance first if required
        check if in cache
    */
    restore(instanceQuery) {
        return __awaiter(this, void 0, void 0, function* () {
            // need to load instance first
            let execution;
            const instance = yield this.dataStore.findInstance(instanceQuery, 'Full');
            yield this.lock(instance.id); // if fails throws exception
            const live = this.cache.getInstance(instance.id);
            if (live) {
                execution = live;
            }
            else {
                execution = yield __1.Execution.restore(this.server, instance);
                /* new dataStore for every execution to be monitored
                const newDataStore = new DataStore(execution.server);
                execution.server.dataStore = newDataStore;
    
                newDataStore.monitorExecution(execution); */
                this.cache.add(execution);
                this.logger.log("restore completed");
            }
            return execution;
        });
    }
    invokeItem(itemQuery, data = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.invoke(itemQuery, data);
        });
    }
    /**
     * update an existing item that is in a wait state with an assignment
     * can modify data or assignment or both
     *
     * -------------------------------------------------
     *
     * @param itemQuery		criteria to retrieve the item
     * @param data
     */
    assign(itemQuery, data = {}, userId = null, assignment = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.log(`Action:engine.assign`);
            this.logger.log(itemQuery);
            try {
                const items = yield this.server.dataStore.findItems(itemQuery);
                if (items.length > 1) {
                    this.logger.error(`query produced more than ${items.length} items expecting only one`);
                }
                const item = items[0];
                if (!item) {
                    this.logger.error("query produced no items for " + JSON.stringify(itemQuery));
                }
                const execution = yield this.restore({ "id": item.instanceId });
                execution.worker = execution.assign(item.id, data, userId, assignment);
                yield this.release(item.instanceId);
                return execution;
            }
            catch (exc) {
                return this.logger.error(exc);
            }
        });
    }
    /**
     * Continue an existing item that is in a wait state
     *
     * -------------------------------------------------
     * scenario:
     *		itemId			{itemId: value }
     *		itemKey			{itemKey: value}
     *		instance,task	{instanceId: instanceId, elementId: value }
     *
     * @param itemQuery		criteria to retrieve the item
     * @param data
     */
    invoke(itemQuery, data = {}, userId = null, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.log(`Action:engine.invoke`);
            this.logger.log(itemQuery);
            try {
                const items = yield this.server.dataStore.findItems(itemQuery);
                if (items.length > 1) {
                    this.logger.error(`query produced more than ${items.length} items expecting only one`);
                }
                const item = items[0];
                if (!item) {
                    this.logger.error("query produced no items for " + JSON.stringify(itemQuery));
                }
                const execution = yield this.restore({ "id": item.instanceId });
                execution.userId = userId;
                execution.worker = execution.signal(item.id, data, options);
                try {
                    if (options['noWait'] == true) {
                        this.logger.log(`.noWait`);
                        execution.worker.then(obj => {
                            this.logger.log('after worker is done releasing ..' + item.instanceId);
                            this.release(item.instanceId);
                        });
                        return execution;
                    }
                    else {
                        const waiter = yield execution.worker;
                        this.logger.log(`.engine.continue ended`);
                        yield this.release(item.instanceId);
                        return execution;
                    }
                }
                catch (exc) {
                    yield this.release(item.instanceId);
                    throw exc;
                }
            }
            catch (exc) {
                return this.logger.error(exc);
            }
        });
    }
    /**
     *
     * Invoking an event (usually start event of a secondary process) against an existing instance
     * or
     * Invoking a start event (of a secondary process) against an existing instance
     * ----------------------------------------------------------------------------
     *	 instance,task
     *```
     *	{instanceId: instanceId, elementId: value }
     *```
     *
     * @param instanceId
     * @param elementId
     * @param data
     */
    startEvent(instanceId, elementId, data = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            // need to load instance first
            this.logger.log('serverinvokeSignal');
            try {
                const execution = yield this.restore({ "id": instanceId });
                yield execution.signal(elementId, data);
                yield this.server.dataStore.save(execution.instance);
                yield this.release(instanceId);
                this.logger.log("invoke completed");
                return execution;
            }
            catch (exc) {
                return this.logger.error(exc);
            }
        });
    }
    throwMessage(messageId, data = {}, matchingQuery = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.log('..Action:engine.throwMessage ', messageId, data, matchingQuery);
            if (!messageId)
                return null;
            // need to load instance first
            const eventsQuery = { "events.messageId": messageId };
            const events = yield this.definitions.findEvents(eventsQuery);
            this.logger.log('..findEvents ' + events.length);
            if (events.length > 0) {
                const event = events[0];
                this.logger.log('..Action:engine.throwMessage found target event ', event.modelName, JSON.stringify(data), event.elementId, event.elementId);
                let ret = yield this.start(event.modelName, data, event.elementId, event.elementId);
                this.logger.log('..Action:engine.throwMessage ended', event.modelName, JSON.stringify(data), event.elementId, event.elementId);
                return ret;
            }
            let itemsQuery = {};
            if (matchingQuery)
                itemsQuery = Object.assign({}, matchingQuery);
            itemsQuery["items.messageId"] = messageId;
            itemsQuery["items.status"] = 'wait';
            const items = yield this.dataStore.findItems(itemsQuery);
            if (items.length > 0) {
                const item = items[0];
                this.logger.log(`Throw Signal ${messageId} found target: ${item.processName} ${item.id}`);
                this.logger.log('..Action:engine.throwMessage found target ', item.processName, item.id);
                return yield this.invoke({ "items.id": item.id }, data);
            }
            else {
                this.logger.log('** engine.throwMessage failed to find a target for ', JSON.stringify(itemsQuery));
                console.log('** engine.throwMessage failed to find a target for ', JSON.stringify(itemsQuery));
            }
            return null;
        });
    }
    /**
     *
     * signal/message raise a signal or throw a message
     *
     * will seach for a matching event/task given the signalId/messageId
     *
     * that can be againt a running instance or it may start a new instance
     * ----------------------------------------------------------------------------
     * @param messageId		the id of the message or signal as per bpmn definition
     * @param matchingQuery	should match the itemKey (if specified)
     * @param data			message data
     */
    throwSignal(signalId, data = {}, matchingQuery = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.log('..Action:engine.Throw Signal ', signalId, data, matchingQuery);
            var instances = [];
            if (!signalId)
                return null;
            // need to load instance first
            const eventsQuery = { "events.signalId": signalId };
            const events = yield this.definitions.findEvents(eventsQuery);
            this.logger.log('..findEvents ' + events.length);
            if (events.length > 0) {
                for (var i = 0; i < events.length; i++) {
                    let event = events[i];
                    this.logger.log('..Action:engine.Throw Signal found target', event.modelName, data, event.elementId);
                    var res = yield this.start(event.modelName, data, event.elementId, null);
                    this.logger.log('Signal end data', res.instance.data);
                    instances.push(res.instance.id);
                }
            }
            let itemsQuery = {};
            if (matchingQuery)
                itemsQuery = Object.assign({}, matchingQuery);
            itemsQuery["items.signalId"] = signalId;
            itemsQuery["items.status"] = 'wait';
            const items = yield this.dataStore.findItems(itemsQuery);
            console.log('throw signal itemsQuery:', itemsQuery, items.length);
            if (items.length > 0) {
                for (var i = 0; i < items.length; i++) {
                    let item = items[i];
                    console.log(`Throw Signal ${signalId} found target: ${item.processName} ${item.id}`);
                }
                for (var i = 0; i < items.length; i++) {
                    let item = items[i];
                    //				console.log(`Throw Signal ${signalId} found target: ${item.processName} ${item.id}`);
                    this.logger.log('..Action:engine.Throw Signal found target', item.processName, item.id);
                    var res = yield this.invoke({ "items.id": item.id }, data);
                    instances.push(res.instance.id);
                }
            }
            return instances;
        });
    }
}
exports.Engine = Engine;
//# sourceMappingURL=Engine.js.map