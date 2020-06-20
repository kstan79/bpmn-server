const { BPMNServer , DefaultAppDelegate , Logger } = require("../../");
const { configuration } = require('../../configuration');


const logger = new Logger({ toConsole: false });

const server = new BPMNServer(configuration, logger);
var caseId = Math.floor(Math.random() * 10000);

let name = 'Buy Used Car';
let process;
let response;
let instanceId;

Feature('Buy Used Car', () => {
        Scenario('Simple', () => {
            Given('Start Buy Used Car Process',async () => {
                response = await server.engine.start(name, {});
            });
            Then('check for output', () => {
                expect(response).to.have.property('execution');
                instanceId = response.execution.id;
                expect(getItem('task_Buy').status).equals('wait');
            });

            When('a process defintion is executed', async () => {

                const data = { needsCleaning: "No", needsRepairs: "No" };
                const query ={
                    instance: { id: instanceId },
                    items: { elementId: 'task_Buy' }};
                response= await server.engine.invoke(query ,data );
            });

            When('engine get', async () => {
                const query = {id: instanceId };

                response = await server.engine.get(query);

                expect(response.instance.id).equals(instanceId);

            });


            Then('check for output to have engine', () => {
                expect(response).to.have.property('execution');
                expect(getItem('task_Buy').status).equals('end');
            });

            and('Clean it', async () => {
                    const query = {
                        instance: {
                            data: { caseId: caseId }},
                        items: { elementId: 'task_clean' }
                    };
                    await server.engine.invoke(query, {});
            });
      
            and('Repair it', async () => {
                    const query = {
                        instance: { id: instanceId },
                        items: { elementId: 'task_repair' }
                    };
                    response = await server.engine.invoke(query, {});
            }); 
            and('Drive it 1', async () => {
                const query = {
                    instance: { id: instanceId },
                    items: { elementId: 'task_Drive' }
                };
                response=await server.engine.invoke(query, {});
            });

            and('Case Complete', async () => {
              expect(response.instance.status).equals('end');
                expect(getItem('task_Drive').status).equals('end');

            });

            let fileName = __dirname + '/../logs/car.log';

            and('write log file to ' + fileName, async () => {
              logger.save(fileName);
            });

        });

    });

function getItem(id)
{
    return response.items.filter(item => { return item.elementId == id; })[0];
}