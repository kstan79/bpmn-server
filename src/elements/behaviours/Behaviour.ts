import { TimerBehaviour, CamundaFormData, IOBehaviour, MessageEventBehaviour, SignalEventBehaviour, TerminateBehaviour, LoopBehaviour } from ".";
import { Node } from "..";
import { Item } from "../../engine/Item";
import { IItem } from "../../..";
import { ScriptBehaviour } from "./Script";


const duration = require('iso8601-duration');
const parse = duration.parse;
const end = duration.end;
const toSeconds = duration.toSeconds;

/** Behaviour
 *      ioSpecification
 *      timer 
 *      message
 *      signal
 *
 *   each behaviour is a class
 *      it scans def and insert itself to perform actions as required
 *
 */
interface IBehaviour {
    start(item: IItem);
    run(item: IItem);
    end(item: IItem);
    restored(item: IItem);
    resume(item: IItem);
    getNodeAttributes(attributes: any[]);
    getItemAttributes(item: IItem, attributes: any[]);
    describe(): string[];
}

class Behaviour implements IBehaviour {
    node: Node;
    definition;
    constructor(node: Node,definition) {
        this.node = node;
        this.definition = definition;
        this.init();
    }
    restored(item) { }
    describe() { return [];}
    init() {}
    start(item: Item) { }
    run(item: Item) { }
    end(item: Item) { }
    resume(item: Item) { }
    getNodeAttributes(attributes: any[]) {}
    getItemAttributes(item: Item, attributes: any[]) { }
}


export { IBehaviour, Behaviour}