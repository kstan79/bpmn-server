import  { configuration }   from '../configuration.js';
import { BPMNServer, Logger } from '..';
import { EventEmitter } from 'events';

const logger = new Logger({ toConsole: true });

console.log(configuration);

configuration.timers.forceTimersDelay = 50000;

console.log(configuration);

test();
var response;

async function test() {

    const server = new BPMNServer(configuration, logger);
    const listener = new EventEmitter();


    response = await server.engine.start('boundary-event');

    response.items.forEach(item => {
        log(`  <${item.name}> -<${item.elementId}> id: <${item.id}> status: <${item.status}>  `);
    });

    log('without waiting complete the task');

    response = await server.engine.invoke({ instance: { id: response.execution.id }, items: { elementId: 'user_task' } }, null);

    response.items.forEach(item => {
        log(`  <${item.name}> -<${item.elementId}> id: <${item.id}>  status: <${item.status}>   `);
    });
    if (getItem('BoundaryEvent_message').status != 'end')
        log("Error item should be end");
    
    if (getItem('BoundaryEvent_timer').status != 'end')
        log("Error item should be end");

    logger.save('boundary.log');
    return;


    response = await server.engine.invoke({ instance: { id: response.execution.id } , items: { elementId: 'task_Buy' } },
        { model: 'Thunderbird', needsRepairs: false, needsCleaning: false });

    console.log("Ready to drive");

    let item= response.items.filter(item => {
        return (item.name== 'Drive');
    })[0];

    console.log('item: -------------');

    console.log(item.data);
    item.data = { cost: 45000 };
    console.log('item: -------------');
    console.log(item.data);

    response = await server.engine.invoke({ instance: { id: response.execution.id }, items: { elementId: 'task_Drive' } });

    console.log(`that is it!, process is now complete status=<${response.execution.status}>`)

}
function log(msg) {
    logger.log(msg);
}
function getItem(id) {
    const item = response.items.filter(item => { return item.elementId == id; })[0]
    if (!item) {
        log('item ' + id + ' not found');
    }
    return item;
}