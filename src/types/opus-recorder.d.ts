declare module 'opus-recorder' {
    interface RecorderConfig {
        encoderPath: string,
        sourceNode: AudioNode
    }

    export default class Recorder {
        constructor(config: RecorderConfig);

        ondataavailable: (arrayBuffer: Uint8Array) => void;

        start(): void;
        stop(): void;

        static isRecordingSupported(): boolean;
    }
}

declare module 'opus-recorder/dist/encoderWorker.min.js' {
    const encoderPath: string;
    export default encoderPath;
}