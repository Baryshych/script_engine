import {scriptEntry, scriptKind, state} from "./types"
import {EventEmitter} from 'events'
import {RedisClientType} from 'redis'
export class Engine {
    private script: scriptEntry[]
    private state: state
    private client: RedisClientType
    private emitter = new EventEmitter()
    constructor(script: scriptEntry[], id: number, client: RedisClientType, currentStep: number = 1) {
        this.script = script
        this.client = client
        this.state =  {
            id,
            script,
            currentStep,
        }
        this.emitter.on('message', message => this.processMessage(message))
    }

    getCurrentState(): scriptEntry {
        return this.script.find(s => s.id === this.state.currentStep)
    }

    processMessage(message: {text: string, user: number}) {
        this.execute(this.script.find(s => s.id === this.state.currentStep), message)
    }

    saveState(step: number) {
        this.state.currentStep = step
        this.client.hSet(`state:${this.state.id}`, 'currentStep', this.state.currentStep)
        this.client.hSet(`state:${this.state.id}`, 'script', this.state.script.toString())
    }

    async recoverState(id: number) {
        const recoveredState = {
          id: id,
            script: await this.client.hGet(`state:${id}`, 'script'),
            currentStep: await this.client.hGet(`state:${id}`, 'currentStep')
        }
    }
    moveToNext(nextScenario: scriptEntry) {
        this.saveState(nextScenario.id)
        // this.execute(nextScenario)
    }

    execute(scenario: scriptEntry, message: {text: string, user: number}) {
        let nextStep: scriptEntry = this.script[0]
        switch (scenario.kind) {
            case scriptKind.send: {
                nextStep = this.executeSend(scenario, message)
                break
            }
            case scriptKind.question: {
                nextStep = this.executeQuestion(scenario, message)
                break
            }
            case scriptKind.switch: {
                nextStep = this.executeSwitch(scenario, message)
                break
            }
        }
        this.moveToNext(nextStep)
    }

    executeQuestion(scenario: scriptEntry, message: {text: string, user: number}): scriptEntry {
        this.emitter.emit('send', message.user)
        return this.script.find(s => s.id === scenario.next[0])
    }

    executeSend(scenario: scriptEntry, message: {text: string, user: number}): scriptEntry {
        this.emitter.emit('send', message.user)
        return this.script.find(s => s.id === scenario.next[0])
    }

    executeSwitch(scenario: scriptEntry, message: {text: string, user: number}): scriptEntry {
        const answers = scenario.data.conditions
        answers.forEach((a, i) => {
            switch (a.operation) {
                case 'eq': {
                    if(a.value === message.text) {
                        this.emitter.emit('send', message.user)
                        return this.script.find(s => s.id === scenario.next[i])
                    }
                }
            }
        })
        return scenario
    }
}