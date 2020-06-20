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
exports.Definition = void 0;
const BpmnModdle = require('bpmn-moddle');
const js_bpmn_moddle_1 = require("./js-bpmn-moddle");
const _1 = require(".");
const fs = require('fs');
//console.log(moddleOptions);
const moddle = new BpmnModdle({ moddleOptions: js_bpmn_moddle_1.moddleOptions });
/**
 *  to be saved in DB to monitor for startEvents:
 *      timer events that start process
 *      message/signal events that are received
 * */
class DefinitionRecord {
}
class DefinitionStartEvent {
}
class Definition {
    constructor(name, source, logger) {
        this.processes = new Map();
        this.nodes = new Map();
        this.flows = [];
        this.name = name;
        this.source = source;
        this.logger = logger;
    }
    loadProcess(definition, processElement) {
        let processId = processElement.id;
        const children = [];
        // process flowElements i.e. nodes 
        processElement.flowElements.forEach(child => {
            //
            let el = definition.elementsById[child.id];
            let node;
            if (el.$type == 'bpmn:SubProcess') { // subprocess
                node = new _1.SubProcess(el.id, processId, el.$type, el);
                node.childProcess = this.loadProcess(definition, el);
            }
            else {
                node = _1.NodeLoader.loadNode(el, processId);
            }
            this.nodes.set(el.id, node);
            children.push(node);
        });
        return new _1.Process(processElement, children);
    }
    load() {
        return __awaiter(this, void 0, void 0, function* () {
            let definition = yield this.getDefinition(this.source, this.logger);
            yield fs.writeFile('definition.txt', JSON.stringify(definition), function (err) {
                if (err)
                    throw err;
            });
            definition.rootElement.rootElements.forEach(e => {
                switch (e.$type) {
                    case 'bpmn:Process':
                        {
                            const proc = this.loadProcess(definition, e);
                            this.processes.set(e.id, proc);
                        }
                        break;
                }
            });
            let refs = new Map();
            /*
    references:
        element                                 part 1
                $type : "bpmn:SequenceFlow"
                id : "flow_start_user"
            property : "bpmn:sourceRef"
            id : "event_start"
        element                                 part 2
                $type : "bpmn:SequenceFlow"
                id : "flow_start_user"
            property : "bpmn:targetRef"
            id : "user_task"
    
             */
            definition.references.forEach(ref => {
                if (ref.element.$type == 'bpmn:SequenceFlow') {
                    //                this.log(`-ref  <${ref.element.id}> <${ref.element.$type}> <${ref.property}> ref to: <${ref.id}>`);
                    let id, type, from, to;
                    id = ref.element.id;
                    type = ref.element.type;
                    let flow = refs.get(id);
                    if (!flow) {
                        flow = { id, type, from, to };
                        refs.set(id, flow);
                    }
                    flow.type = ref.element.$type;
                    if (ref.property == 'bpmn:sourceRef') {
                        flow.from = ref.id;
                    }
                    else
                        flow.to = ref.id;
                }
                // 
                // get boundary events
                /*
        reference
            element
                $type : "bpmn:BoundaryEvent"
                id : "BoundaryEvent_0qdlc8p"
            property : "bpmn:attachedToRef"
            id : "user_task"
                 */
                if (ref.element.$type == "bpmn:BoundaryEvent") {
                    const event = this.getNodeById(ref.element.id);
                    const owner = this.getNodeById(ref.id);
                    if (owner.type !== 'bpmn:SequenceFlow') {
                        event.attachedTo = owner;
                        owner.attachments.push(event);
                    }
                }
            });
            refs.forEach(ref => {
                const fromNode = this.getNodeById(ref.from);
                const toNode = this.getNodeById(ref.to);
                const flow = new _1.Flow(ref.id, ref.type, fromNode, toNode, definition.elementsById[ref.id]);
                this.flows.push(flow);
                fromNode.outbounds.push(flow);
                toNode.inbounds.push(flow);
            });
            // last step get messageFlows:
            //  root
            definition.rootElement.rootElements.forEach(e => {
                if (e.$type == 'bpmn:Collaboration') {
                    if (e.messageFlows) {
                        e.messageFlows.forEach(mf => {
                            const fromNode = this.getNodeById(mf.sourceRef.id);
                            const toNode = this.getNodeById(mf.targetRef.id);
                            const flow = new _1.MessageFlow(mf.id, mf.$type, fromNode, toNode, mf);
                            fromNode.outbounds.push(flow);
                            toNode.inbounds.push(flow);
                        });
                    }
                }
            });
            return definition;
        });
    }
    getJson() {
        const elements = [];
        const flows = [];
        this.nodes.forEach(node => {
            let behaviours = [];
            node.behaviours.forEach(behav => {
                behaviours.push(behav.describe());
            });
            elements.push({ id: node.id, name: node.name, type: node.type, description: node.describe(), behaviours });
        });
        this.flows.forEach(flow => {
            flows.push({ id: flow.id, from: flow.from.id, to: flow.to.id, type: flow.type, description: flow.describe() });
        });
        return JSON.stringify({ elements, flows });
    }
    getDefinition(source, logger) {
        return __awaiter(this, void 0, void 0, function* () {
            const result = yield moddle.fromXML(source);
            return result;
        });
    }
    getStartNode() {
        let start = null;
        this.processes.forEach(proc => {
            start = proc.getStartNode();
            //            if (start)
            //                return start;
        });
        return start;
    }
    getNodeById(id) {
        return this.nodes.get(id);
    }
}
exports.Definition = Definition;
//# sourceMappingURL=Definition.js.map