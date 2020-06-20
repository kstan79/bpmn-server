import { BPMNServer, DefaultAppDelegate, Logger } from '../.';
import { configuration } from '../configuration';
import { ExecutionContext, ExecutionResponse } from '../';


const logger = new Logger({ toConsole: false });

const server = new BPMNServer(configuration, logger);
console.log(configuration);

//=-=-=-==============================
test();
async function test() {

let name = 'loop';

let context: ExecutionResponse;
let items;

            let data = { records: [1, 2, 3] };
            context= await server.engine.start(name, data);


                  delay(500, 'test');
                  items = context.items;
                  console.log(items.filter(i => i.element.id == 'scriptTask').length+" Should be 3");
                  console.log(items.filter(i => i.element.id == 'serviceTask').length+" should be 3");

            console.log(context.execution.status);
        
            let fileName = __dirname + '/' + name + '.log';
            logger.save(fileName);
}


async function delay(time, result) {
    console.log("delaying ... " + time)
    return new Promise(function (resolve) {
        setTimeout(function () {
            console.log("delayed is done.");
            resolve(result);
        }, time);
    });
}