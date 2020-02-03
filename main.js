'use strict';

/*
 * Created with @iobroker/create-adapter v1.21.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');
//const _ = require('lodash');

// Load your modules here, e.g.:
// const fs = require("fs");

class Template extends utils.Adapter {

    /**
     * @param {Partial<ioBroker.AdapterOptions>} [options={}]
     */
    constructor(options) {
        super({
            ...options,
            name: 'homemode',
        });
        this.on('ready', this.onReady.bind(this));
        this.on('objectChange', this.onObjectChange.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        // this.on('message', this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    /**
     * Is called when databases are connected and adapter received configuration.
     */
    async onReady() {

        // Initialize your adapter here

        // The adapters config (in the instance object everything under the attribute "native") is accessible via
        // this.config:
        for (const index in this.config.setup) {
            this.setObjectNotExists(this.config.setup[index]['rgr'], {
                type: 'channel',
                common: {
                    name: 'RESIDENTS: ' + this.config.setup[index]['rgr']
                },
                native: {}
            });

            this.setObjectNotExists(this.config.setup[index]['rgr'] + '.state', {
                type: 'state',
                common: {
                    name: 'state',
                    type: 'boolean',
                    role: 'value',
                    read: true,
                    write: false
                },
                native: {}
            });

            this.setObjectNotExists(this.config.setup[index]['rgr'] + '.' + this.config.setup[index]['rr'], {
                type: 'channel',
                common: {
                    name: 'ROOMMATE: ' + this.config.setup[index]['rr']
                },
                native: {}
            });

            this.setObjectNotExists(this.config.setup[index]['rgr'] + '.' + this.config.setup[index]['rr'] + '.devices', {
                type: 'state',
                common: {
                    name: 'devices',
                    def: this.config.setup[index]['devices'],
                    type: 'array',
                    role: 'list',
                    read: true,
                    write: false
                },
                native: {}
            });
            this.setObjectNotExists(this.config.setup[index]['rgr'] + '.' + this.config.setup[index]['rr'] + '.state', {
                type: 'state',
                common: {
                    name: 'state',
                    type: 'string',
                    role: 'list',
                    read: true,
                    write: true,
                    states: {
                        home: 'home',
                        gotosleep: 'gotosleep',
                        absent: 'absent',
                        gone: 'gone'
                    }
                },
                native: {}
            });
            this.subscribeForeignStates(this.config.setup[index]['devices']);
        }

        /*
        For every state in the system there has to be also an object of type state
        Here a simple template for a boolean variable named "testVariable"
        Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
        */
        //   await this.setObjectIfNotExistsAsync('testVariable', {
        //       type: 'state',
        //       common: {
        //           name: 'testVariable',
        //           type: 'boolean',
        //           role: 'indicator',
        //           read: true,
        //           write: true,
        //       },
        //       native: {},
        //   });

        // in this template all states changes inside the adapters namespace are subscribed
        this.subscribeStates('*');

        /*
        setState examples
        you will notice that each setState will cause the stateChange event to fire (because of above subscribeStates cmd)
        */
        // the variable testVariable is set to true as command (ack=false)
        //await this.setStateAsync('testVariable', true);

        // same thing, but the value is flagged "ack"
        // ack should be always set to true if the value is received from or acknowledged from the target system
        //await this.setStateAsync('testVariable', { val: true, ack: true });

        // same thing, but the state is deleted after 30s (getState will return null afterwards)
        //await this.setStateAsync('testVariable', { val: true, ack: true, expire: 30 });

        // examples for the checkPassword/checkGroup functions
        //let result = await this.checkPasswordAsync('admin', 'iobroker');
        //this.log.info('check user admin pw iobroker: ' + result);

        //result = await this.checkGroupAsync('admin', 'admin');
        //this.log.info('check group user admin group admin: ' + result);
        this.log.info('ready...');
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     * @param {() => void} callback
     */
    onUnload(callback) {
        try {
            this.log.info('cleaned everything up...');
            callback();
        } catch (e) {
            callback();
        }
    }

    /**
     * Is called if a subscribed object changes
     * @param {string} id
     * @param {ioBroker.Object | null | undefined} obj
     */
    onObjectChange(id, obj) {
        if (obj) {
            // The object was changed
            this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
        }
    }

    /**
     * Is called if a subscribed state changes
     * @param {string} id
     * @param {ioBroker.State | null | undefined} state
     */
    onStateChange(id, state) {
        this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);

        if (!id.includes('homemode.')) {
            for (const index in this.config.setup) {
                if (this.config.setup[index]['devices'].includes(id)) {
                    this.setState(this.config.setup[index]['rgr'] + '.' + this.config.setup[index]['rr'] + '.state', state.val ? 'home':'absent');
                }
            }
        } else {
            const split = id.split('.');
            if (split.length == 5 && split[4] == 'state') {
                const states = [];
                for (const index in this.config.setup) {
                    if (this.config.setup[index]['rgr'] == split[2]) {
                        this.getState(this.config.setup[index]['rgr'] + '.' + this.config.setup[index]['rr'] + '.state', (err, state) => {
                            states.push(state.val);
                            this.log.info(state.val);
                        });
                    }

                    this.log.info(JSON.stringify(states));
                }
            }
        }
    }

    // /**
    //  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
    //  * Using this method requires "common.message" property to be set to true in io-package.json
    //  * @param {ioBroker.Message} obj
    //  */
    // onMessage(obj) {
    // 	if (typeof obj === 'object' && obj.message) {
    // 		if (obj.command === 'send') {
    // 			// e.g. send email or pushover or whatever
    // 			this.log.info('send command');

    // 			// Send response in callback if required
    // 			if (obj.callback) this.sendTo(obj.from, obj.command, 'Message received', obj.callback);
    // 		}
    // 	}
    // }

}

// @ts-ignore parent is a valid property on module
if (module.parent) {
    // Export the constructor in compact mode
    /**
     * @param {Partial<ioBroker.AdapterOptions>} [options={}]
     */
    module.exports = (options) => new Template(options);
} else {
    // otherwise start the instance directly
    new Template();
}