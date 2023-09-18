export type scriptEntry = {
    id: number,
    kind: scriptKind,
    data: any,
    next?: number[]
}
export type state = {
    script: scriptEntry[],
    currentStep: number,
    id: number,
}

export enum scriptKind {
    question,
    send,
    switch
}