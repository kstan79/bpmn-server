import { Execution } from '../engine/Execution';
import { EXECUTION_EVENT } from '../../';
import { exec } from 'child_process';
import { Logger } from '../common/Logger';
import { IConfiguration } from '../interfaces/common';

import { ServerComponent } from './ServerContext';
import { BPMNServer } from './BPMNServer';

const fs = require('fs');

const MongoDB = require('./MongoDB').MongoDB;

//import { IDataStore } from './API';

/*
 * Data Query:
 * 
 * 
 * 
  {}
  { "items": { $elemMatch: { type: 'bpmn:StartEvent' } } }
 * 
 */ 

const Instance_collection = 'wf_instances';
const Events_collection = 'wf_events';


class DataStore extends ServerComponent  { //implements IDataStore {

	dbConfiguration;
	db;


	execution: Execution;
	isModified = false;
	isRunning = false;
	inSaving = false;
	promises = [];

	constructor(server: BPMNServer) {
		super(server);

		this.dbConfiguration = this.configuration.database.MongoDB;
		this.db = new MongoDB(this.dbConfiguration, this.logger);

	}
	monitorExecution(execution: Execution) {
		this.execution = execution;
		const listener = execution.listener;
		this.setListener(listener);
	}
	private setListener(listener) {

		let self = this;
		listener.on('end', async function ({ item, event }) {
			if (!self.isRunning) {
				await self.check(event,item);
			}
		});


		listener.on('wait', async function ({ item, event }) {
			if (!self.isRunning) {
				await self.check(event, item);
			}
		});
	}
	saveCounter = 0;
	async save() {
		if (this.inSaving) {
			// come back please
			this.saveCounter++;	/// will do it after I am done
			this.logger.log(" in saving take a number #" + this.saveCounter);
			return;
			//			await Promise.all(this.promises);
			//			this.inSaving = false;
		}
		let currentCounter = this.saveCounter;
		this.inSaving = true;
		if (this.isModified) {
			this.logger.log('DataStore: saving ');
			let state = await this.execution.getState();
			if (state.saved !== this.execution.saved) {
				console.log("********* ERROR OLD State****");
			}

			await this.saveInstance(state, this.execution.getItems())
			this.execution.saved = new Date().toISOString();;
			this.logger.log('DataStore: saved ' + this.execution.saved);

			while (this.saveCounter > currentCounter) {	// will do it again
				this.logger.log('DataStore:while i was busy other changes happended' + this.saveCounter);
				currentCounter = this.saveCounter;
				state = await this.execution.getState();
				await this.saveInstance(state, this.execution.getItems())
				this.execution.saved = new Date().toISOString();;
				this.logger.log('DataStore: saved again ' + this.execution.saved);

			}
			this.isModified = false;
		}
		this.inSaving = false;
	}
	async check(event, item) {
		if (item)
			this.logger.log('DataStore: instance modified...' + event + 'item:' + item.elementId);
		else
			this.logger.log('DataStore: instance modified...' + event);

		this.isModified = true;
		setTimeout(this.save.bind(this), 500);

	}
	async loadInstance(instanceId) {

		const recs = await this.findInstances({ id: instanceId }, 'full');
		if (recs.length == 0) {

			this.logger.error("Instance is not found for this item");
			return null;
		}
		const instanceData = recs[0];

		this.logger.log(" instance obj found" + instanceData.id);

		return { instance: instanceData, items: this.getItemsFromInstances([instanceData]) };
	}

	private getItemsFromInstances(instances, condition = null) {
		const items = [];
		instances.forEach(instance => {
			instance.items.forEach(i => {
				let pass = true;

				if (condition) {
					const keys = Object.keys(condition);
					keys.forEach(key => {
						if (i[key] != condition[key])
							pass = false;
					});
				}
				if (pass) {
					i['processName'] = instance.name;
					i['data'] = instance.data;
					i['instanceId'] = instance.id;
					items.push(i);
				}
			});
		});
		return items.sort(function (a, b) { return (a.seq - b.seq); });
	}
	// save instance to DB
	static seq = 0;
	private async saveInstance(instance, items) {
		this.logger.log("Saving...");


		//var json = JSON.stringify(instance.state, null, 2);
		const tokensCount = instance.tokens.length;
		let itemsCount = instance.items.length;
		this.logger.log('saving instance ' + tokensCount + " tokens and items: " + itemsCount);

		var recs;
		if (!instance.saved) {
			instance.saved = new Date().toISOString();;

			//this.promises.push(this.db.insert(this.dbConfiguration.db, Instance_collection, [instance]));
			this.promises.push(this.db.insert(this.dbConfiguration.db, Instance_collection, [instance]));

			this.logger.log("inserting instance");
		}
		else {
			this.promises.push(this.db.update(this.dbConfiguration.db, Instance_collection,
				{ id: instance.id },
				{
					$set:
					{
						tokens: instance.tokens, items: instance.items, loops: instance.loops,
						endedAt: instance.endedAt, status: instance.status, saved: instance.saved, logs: instance.logs, data: instance.data
					}
				}));

/*			let fileName = instance.name + '_' + DataStore.seq++ + '.state';
			await fs.writeFile(fileName, JSON.stringify(instance), function (err) {
				if (err) throw err;
			});
*/
			this.logger.log("updating instance");
		}

		await Promise.all(this.promises);
		this.logger.log('DataStore:saving Complete');

	}

	async findItem(query) {
		let results = await this.findItems(query);
		if (results.length == 0)
			throw Error(" No items found for " + JSON.stringify(query));
		else if (results.length > 1)
			throw Error(" More than one record found " + results.length + JSON.stringify(query));
		else
			return results[0];

	}
	async findInstance(query, options) {

		let results = await this.findInstances(query, options);
		if (results.length == 0)
			throw Error(" No instance found for " + JSON.stringify(query));
		else if (results.length > 1)
			throw Error(" More than one record found " + results.length + JSON.stringify(query));
		else
			return results[0];

	}
	async findInstances(query, option: 'summary' | 'full' | any ='summary') {

		let projection;

		if (option == 'summary')
			projection = { source: 0, logs: 0 };
		else
			projection = {};

		var records = await this.db.find(this.dbConfiguration.db, Instance_collection, query, projection);
		return records;
	}
	/**
            * scenario:
            * itemId			{ items { id : value } }
            * itemKey			{ items {key: value } }
            * instance, task	{ instance: { id: instanceId }, items: { elementId: value }}
            * message			{ items: { messageId: nameofmessage, key: value } {}
            * status			{ items: {status: 'wait' } }
            * custom: { query: query, projection: projection }
            *
	 *
	 * @param query
	 */
	async findItems(query) {
		// let us rebuild the query form {status: value} to >  "tokens.items.status": "wait" 
		const result = this.translateCriteria(query);

		var records = await this.db.find(this.dbConfiguration.db, Instance_collection, result.query, result.projection);

		this.logger.log('find items for ' + JSON.stringify(query) + " result :" + JSON.stringify(result)+" recs:"+records.length);

		//		return this.getItemsFromInstances(records,query);
		return this.getItemsFromInstances(records, null);

	}
	private translateCriteria(criteria) {

		let match = {};
		let query = {};
		let projection = {};
		if (criteria.query) {

			return { query: criteria.query, projecton: criteria.projection };
		}
		const instance = criteria.instance;
		const items = criteria.items;
		if (instance) {
			Object.keys(instance).forEach(key => {
				query[key] = instance[key];
			});
		}
		if (items && Object.keys(items).length > 0) {
			Object.keys(items).forEach(key => {
				match[key] = items[key];
				query["items." + key] = items[key];
			});
			projection = { id: 1, data: 1, name: 1, "items": { $elemMatch: match } };
		}
		return { query, projection };



		// { "items": { $elemMatch: { type: 'bpmn:StartEvent' } } }
		Object.keys(criteria).forEach(key => {
			query[key] = criteria[key];
			if (key.startsWith("items.")) {
				match[key] = criteria[key];
			}

		});
		projection = { id: 1, data: 1, name: 1, "items": { $elemMatch: match } };
		return { query, projection };

		if (criteria.itemId) {
			query = { "items.id": criteria.itemId };
			projection = { id: 1, data: 1, name: 1, "items": { $elemMatch: { id: criteria.itemId } } };
		}
		else if (criteria.status) {
			query = { "items.status": criteria.status };
			projection = { id: 1, data: 1, name: 1, "items": { $elemMatch: { status: criteria.status } } };
		}
		else if (criteria.itemKey) {
			query = { "items.itemKey": criteria.itemKey };
			projection = { id: 1, data: 1, name: 1, "items": { $elemMatch: { itemKey: criteria.itemKey } } };
		}
		else if (criteria.data) {
			query = { "data": criteria.data };
			projection = { id: 1, data: 1, name: 1, "items": { $elemMatch: { itemKey: criteria.itemKey } } };
		}
		else if (criteria.instanceId) {
			query = { "id": criteria.instanceId };
			projection = { id: 1, data: 1, name: 1, "items": { $elemMatch: { "elementId": criteria.elementId } } };
		}
		else
			return { query: null, projection: null };
		return { query, projection };
	}

	async deleteData(instanceId = null) {
		if (instanceId) {
			this.cache.remove(instanceId);
			await this.db.remove(this.dbConfiguration.db, Instance_collection, { id: instanceId });

		}
		else {
			this.cache.shutdown();
			await this.db.remove(this.dbConfiguration.db, Instance_collection, {});

		}

	}
	// Events Registery
	async addEvent(eventData) {
		return await this.db.insert(this.dbConfiguration.db, Events_collection, [eventData]);
	}
	async findEvents(query) {
		var records = await this.db.find(this.dbConfiguration.db, Events_collection, query);
		return records;
	}
	async deleteEvents(query) {

		return await this.db.remove(this.dbConfiguration.db, Events_collection, query);
    }

}
export { DataStore };