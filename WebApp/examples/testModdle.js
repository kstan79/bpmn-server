//import BpmnModdle from 'bpmn-moddle';

const BpmnModdle = require('bpmn-moddle');
const fs = require('fs');
const Logger = require('./logger');

const logger = new Logger.Logger({ toConsole: true });


const source = `
<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions 
    xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" 
    xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" 
    xmlns:di="http://www.omg.org/spec/DD/20100524/DI" 
    xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" 
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
    xmlns:camunda="http://camunda.org/schema/1.0/bpmn" 
    exporter="bpmn-js (https://demo.bpmn.io)" exporterVersion="6.5.1">
  <bpmn:collaboration id="Collaboration_0memx95">
    <bpmn:participant id="Participant_1c0lpx5" processRef="Process_1hf9394" />
  </bpmn:collaboration>
  <bpmn:process id="Process_1hf9394" isExecutable="true">
    <bpmn:startEvent id="StartEvent_158yep3">
      <bpmn:outgoing>flow_start_buy</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:userTask id="task_Buy" name="Buy">
      <bpmn:extensionElements>
        <camunda:formData>
          <camunda:formField id="repairsRequired" label="Repairs Required?" type="boolean" />
          <camunda:formField id="cleaningRequired" label="Cleaning Required?" type="boolean" />
        </camunda:formData>
      </bpmn:extensionElements>
      <bpmn:incoming>flow_start_buy</bpmn:incoming>
      <bpmn:outgoing>flow_buy_gateway</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:userTask id="task_clean" name="Clean">
      <bpmn:incoming>flow_gateway_clean</bpmn:incoming>
      <bpmn:outgoing>flow_clean_gateway</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:parallelGateway id="gateway_2">
      <bpmn:incoming>flow_repair_gateway</bpmn:incoming>
      <bpmn:incoming>flow_clean_gateway</bpmn:incoming>
      <bpmn:outgoing>flow_gateway_drive</bpmn:outgoing>
    </bpmn:parallelGateway>
    <bpmn:endEvent id="Event_19ebav7">
      <bpmn:incoming>flow_drive_end</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:userTask id="task_repair" name="Repair">
      <bpmn:incoming>flow_gateway_repair</bpmn:incoming>
      <bpmn:outgoing>flow_repair_gateway</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:sequenceFlow id="flow_start_buy" sourceRef="StartEvent_158yep3" targetRef="task_Buy" />
    <bpmn:sequenceFlow id="flow_buy_gateway" sourceRef="task_Buy" targetRef="gateway_1" />
    <bpmn:sequenceFlow id="flow_gateway_repair" sourceRef="gateway_1" targetRef="task_repair">
      <bpmn:conditionExpression>(this.needsRepairs==true)</bpmn:conditionExpression>
    </bpmn:sequenceFlow >
    <bpmn:sequenceFlow id="flow_gateway_clean" sourceRef="gateway_1" targetRef="task_clean">
      <bpmn:conditionExpression>(this.needsCleaning==true)</bpmn:conditionExpression>
    </bpmn:sequenceFlow >
    <bpmn:sequenceFlow id="flow_repair_gateway" sourceRef="task_repair" targetRef="gateway_2" />
    <bpmn:sequenceFlow id="flow_clean_gateway" sourceRef="task_clean" targetRef="gateway_2" />
    <bpmn:sequenceFlow id="flow_gateway_drive" sourceRef="gateway_2" targetRef="task_Drive" />
    <bpmn:sequenceFlow id="flow_drive_end" sourceRef="task_Drive" targetRef="Event_19ebav7" />
    <bpmn:userTask id="task_Drive" name="Drive">
      <bpmn:incoming>flow_gateway_drive</bpmn:incoming>
      <bpmn:outgoing>flow_drive_end</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:inclusiveGateway id="gateway_1">
      <bpmn:incoming>flow_buy_gateway</bpmn:incoming>
      <bpmn:outgoing>flow_gateway_repair</bpmn:outgoing>
      <bpmn:outgoing>flow_gateway_clean</bpmn:outgoing>
    </bpmn:inclusiveGateway>
  </bpmn:process>
</bpmn:definitions>
`;

const moddleOptions = require('./js-bpmn-moddle.json');
//console.log(moddleOptions);
const moddle = new BpmnModdle({ moddleOptions });

const result = getDefinition(source, logger);
console.log(result);
async function getDefinition(source, logger) {

    logger.log('getDefinition');
    //   logger.log(await getElements());
    //    return;

    const result = await moddle.fromXML(source);
    fs.writeFile('modlle2.txt', JSON.stringify(result), function (err) {
        if (err) throw err;
    });

    // should return
    /*
     *  proceses
     *  for each process->elements
     */
    let processes = [];
    let elements = [];
    let flows = [];

    //
    console.log(' gettting root elements ');
    getChildren(result.rootElement);
    console.log('==================');
    result.rootElement.rootElements.forEach(e => {
        getNodeProps(e);
        switch (e.$type) {
            case 'bpmn:Process':    //process it
                {
                    console.log('Process----');
                    console.log(e.flowElements.length);
                    e.flowElements.forEach(child => {
                        console.log(child.$type);
                    });
                }
                break;
        }
    });
    return;

    result.rootElement.rootElements.forEach(root => {
        getChildren(root);
    });;
    return;
    let keys = Object.keys(result.elementsById)
    keys.forEach(key => {
        let el = result.elementsById[key];

        elements.push(el);
        logger.log("Element: " + el.$type + " " + el.id + JSON.stringify(el));
    });


    return { definition: result, elements: result.elementsById, flows: result.references };
}

/**
 *  getRootElemens
 *          process
 *          message
 *          lane
 *          participant
 *  getProcessElements 
 * 
 * @param {any} node
 * @param {any} parent
 */
function getNodeProps(node) {
    let keys = Object.keys(node)
    let item = '';
    keys.forEach(key => {
        const val = node[key];
        if (Array.isArray(val)) { }
        else {
            item += ' ' + key + '=' + val;
        }
    });
    logger.log(item);
    return item;
}

function getChildren(node) {
    let keys = Object.keys(node)
    keys.forEach(key => {
        const val = node[key];
        if (Array.isArray(val)) {
            logger.log(key + "..");
            val.forEach(e => {
                getNodeProps(e);
            });
        }
    });



}
function getTree(node, parent='root') {
    let keys = Object.keys(node)
    let item = '';
    let children = [];
    keys.forEach(key => {
        const val = node[key];
        if (Array.isArray(val)) {
        }
        else
            item += ' ' + key + '=' + val;
    });
    logger.log(parent + ":" + item);

    keys.forEach(key => {
        const val = node[key];
        if (Array.isArray(val)) {
            logger.log(parent + ":" + key + "..");
            val.forEach(e => { getTree(e, key); });
        }
    }); 



}

module.exports = { getDefinition }; 