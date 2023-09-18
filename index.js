

import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { createClient } from 'redis';
import {argv} from 'yargs';
import {Engine} from "./engine.js";
const script = [
    {
        id: 0,
        kind: 'send',
        data: {text: 'Hallo meine lieber Juden'},
        next: [1],
    },
    {
        id: 1,
        kind: 'question',
        data: {text: 'Bist du gut Juden?', options: ['Ja', 'Nein']},
        next: [2],
    },
    {
        id: 3,
        kind: 'switch',
        data: {
            conditions: [
                {property: 'asnwer', operation: 'eq', value: 'Ja'},
                {property: 'asnwer', operation: 'eq', value: 'Nein'},
            ]
        },
        next: [4, 5],
    },
    {
        id: 4,
        kind: 'send',
        data: {text: 'Gutt'},
    },
    {
        id: 5,
        kind: 'send',
        data: {text: 'Nicht Gutt'},
    }
]
const rl = readline.createInterface({ input, output });

const client = createClient();
const id = argv.id;
client.on('error', err => console.log('Redis Client Error', err));

await client.connect();

const step = await client.hGet(`state:${id}`, 'currentStep');
const engine = new Engine(script, id, client, step ? step : 1)

while(true) {
    const answer = await rl.question(engine.getCurrentState().data.text);
    engine.emit('message', answer);
}

await client.disconnect();
rl.close();