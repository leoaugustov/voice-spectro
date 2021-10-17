import Recorder from 'opus-recorder';
import encoderPath from 'opus-recorder/dist/encoderWorker.min.js';
import debounce from 'lodash.debounce';

import initializeControlsUi from './controls-ui';
import { Circular2DBuffer } from './math-util';
import { SpectrogramGPURenderer, RenderParameters } from './spectrogram-render';
import { offThreadGenerateSpectrogram } from './worker-util';

const SPECTROGRAM_WINDOW_SIZE = 4096;
const SPECTROGRAM_WINDOW_OVERLAP = 1024;

interface SpectrogramBufferData {
    buffer: Float32Array;
    start: number;
    length: number;
    sampleRate: number;
    isStart: boolean;
}

// Starts rendering the spectrogram, returning callbacks used to provide audio samples to render
// and update the display parameters of the spectrogram
async function startRenderingSpectrogram(): Promise<{
    bufferCallback: (bufferData: SpectrogramBufferData) => Promise<Float32Array>;
    clearCallback: () => void;
    updateRenderParameters: (parameters: Partial<RenderParameters>) => void;
}> {
    // The canvas that will render the spectrogram
    const spectrogramCanvas = document.querySelector('.charts-container .spectrogram canvas') as HTMLCanvasElement;

    // The callback that will render the audio samples provided when called
    let bufferCallback: (bufferData: SpectrogramBufferData) => Promise<Float32Array>;

    // Set up the WebGL context for the spectrogram
    let spectrogramBuffer: Circular2DBuffer<Float32Array>;
    let renderer: SpectrogramGPURenderer;
    if (spectrogramCanvas !== null && spectrogramCanvas.parentElement !== null) {
        // The 2D circular queue of the FFT data
        spectrogramBuffer = new Circular2DBuffer(
            Float32Array,
            spectrogramCanvas.parentElement.offsetWidth,
            SPECTROGRAM_WINDOW_SIZE / 2,
            1
        );

        renderer = new SpectrogramGPURenderer(
            spectrogramCanvas,
            spectrogramBuffer.width,
            spectrogramBuffer.height
        );
        renderer.resizeCanvas(spectrogramCanvas.parentElement.offsetWidth, spectrogramCanvas.parentElement.offsetHeight);

        let imageDirty = false;
        bufferCallback = async ({ buffer, start, length, sampleRate, isStart }: SpectrogramBufferData) => {
            renderer.updateParameters({
                windowSize: SPECTROGRAM_WINDOW_SIZE,
                sampleRate,
            });

            const spectrogram = await offThreadGenerateSpectrogram(buffer, start, length, {
                windowSize: SPECTROGRAM_WINDOW_SIZE,
                windowStepSize: SPECTROGRAM_WINDOW_OVERLAP,
                sampleRate,
                isStart,
            });
            spectrogramBuffer.enqueue(spectrogram.spectrogram);
            imageDirty = true;

            return spectrogram.input;
        };

        // Trigger a render on each frame only if we have new spectrogram data to display
        const render = () => {
            if (imageDirty) {
                renderer.updateSpectrogram(spectrogramBuffer);
            }
            renderer.render();
            requestAnimationFrame(render);
        };
        requestAnimationFrame(render);
    }

    // Handle resizing of the window
    const resizeHandler = debounce(() => {
        if (spectrogramCanvas === null || spectrogramCanvas.parentElement === null) {
            return;
        }

        spectrogramBuffer.resizeWidth(spectrogramCanvas.parentElement.offsetWidth);
        renderer.resizeCanvas(
            spectrogramCanvas.parentElement.offsetWidth,
            spectrogramCanvas.parentElement.offsetHeight
        );
        renderer.updateSpectrogram(spectrogramBuffer);
    }, 250);
    window.addEventListener('resize', resizeHandler);

    // Make sure the canvas still displays properly in the middle of a resize
    window.addEventListener('resize', () => {
        if (spectrogramCanvas === null || spectrogramCanvas.parentElement === null) {
            return;
        }
        renderer.fastResizeCanvas(
            spectrogramCanvas.parentElement.offsetWidth,
            spectrogramCanvas.parentElement.offsetHeight
        );
    });

    return {
        bufferCallback: (buffer: SpectrogramBufferData) => {
            if(bufferCallback) {
                return bufferCallback(buffer);
            }
            return Promise.reject("Buffer callback not initialized");
        },
        clearCallback: () => {
            spectrogramBuffer.clear();
            renderer.updateSpectrogram(spectrogramBuffer, true);
        },
        updateRenderParameters: (parameters: Partial<RenderParameters>) => {
            renderer.updateParameters(parameters);
        },
    };
}

async function setupSpectrogramFromMicrophone(
    audioCtx: AudioContext,
    bufferCallback: (bufferData: SpectrogramBufferData) => Promise<Float32Array>,
    recordingFinishedCallback: (recordedAudioFile: Blob) => void
) {
    const CHANNELS = 1;
    const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    const microphone = audioCtx.createMediaStreamSource(audioStream);

    let recorder: (Recorder | null) = null;
    if(Recorder.isRecordingSupported()) {
        recorder = new Recorder({ sourceNode: microphone, encoderPath });
        recorder.ondataavailable = (arrayBuffer: Uint8Array) => {
            recordingFinishedCallback(new Blob([arrayBuffer], { type: 'audio/wav' }));
        };
    }

    const processor = audioCtx.createScriptProcessor(
        SPECTROGRAM_WINDOW_OVERLAP,
        CHANNELS,
        CHANNELS
    );

    // An array of the last received audio buffers
    const buffers: Float32Array[] = [];

    let sampleRate: number | null = null;
    let isStart = true;
    let bufferCallbackPromise: Promise<Float32Array> | null = null;
    const processChannelBuffers = () => {
        if (bufferCallbackPromise !== null) {
            return;
        }

        let mergedBuffer;
        // Check if we have at least full window to render yet
        if (! (buffers.length < SPECTROGRAM_WINDOW_SIZE / SPECTROGRAM_WINDOW_OVERLAP)) {
            // Merge all the buffers we have so far into a single buffer for rendering
            mergedBuffer = new Float32Array(buffers.length * SPECTROGRAM_WINDOW_OVERLAP);
            for (let i = 0; i < buffers.length; i++) {
                mergedBuffer.set(buffers[i], SPECTROGRAM_WINDOW_OVERLAP * i);
            }

            // Delete the oldest buffers that aren't needed any more for the next render
            buffers.splice(0, buffers.length - SPECTROGRAM_WINDOW_SIZE / SPECTROGRAM_WINDOW_OVERLAP + 1);
        }

        // Render the single merged buffer
        if (mergedBuffer) {
            bufferCallbackPromise = bufferCallback({
                buffer: mergedBuffer,
                start: 0,
                length: mergedBuffer.length,
                sampleRate: sampleRate!,
                isStart,
            });
            bufferCallbackPromise.then(() => {
                bufferCallbackPromise = null;
            });
            isStart = false;
        }
    };

    // Each time we record an audio buffer, save it and then render the next window when we have
    // enough samples
    processor.addEventListener('audioprocess', e => {
        buffers.push(new Float32Array(e.inputBuffer.getChannelData(0)));
        sampleRate = e.inputBuffer.sampleRate;
        processChannelBuffers();
    });

    microphone.connect(processor);
    processor.connect(audioCtx.destination);
    recorder?.start();

    return () => {
        recorder?.stop();
        processor.disconnect(audioCtx.destination);
        microphone.disconnect(processor);
        audioStream.getTracks()[0].stop();
    };
}

async function setupSpectrogramFromAudioFile(
    audioCtx: AudioContext,
    arrayBuffer: ArrayBuffer,
    bufferCallback: (bufferData: SpectrogramBufferData) => Promise<Float32Array>,
    audioEndCallback: () => void
) {
    const audioBuffer = await new Promise<AudioBuffer>((resolve, reject) =>
        audioCtx.decodeAudioData(
            arrayBuffer,
            buffer => resolve(buffer),
            err => reject(err)
        )
    );

    let channelsMixedData: Float32Array;
    if(audioBuffer.numberOfChannels > 1) {
        const channelDataLength = audioBuffer.getChannelData(0).length;
        channelsMixedData = new Float32Array(channelDataLength);

        for(let i = 0; i < audioBuffer.numberOfChannels; i++) {
            const channelData = new Float32Array(audioBuffer.getChannelData(i));

            for(let j = 0; j < channelDataLength; j++) {
                channelsMixedData[j] += channelData[j];
            }
        }
    }else {
        channelsMixedData = new Float32Array(audioBuffer.getChannelData(0));
    }

    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);
    let isStopping = false;
    const playStartTime = performance.now();
    let nextSample = 0;

    const audioEventCallback = async () => {
        const duration = (performance.now() - playStartTime) / 1000;

        // Calculate spectrogram up to current point
        const totalSamples =
            Math.ceil((duration * audioBuffer.sampleRate - nextSample) / SPECTROGRAM_WINDOW_SIZE) *
            SPECTROGRAM_WINDOW_SIZE;

        if (totalSamples > 0) {
            const bufferCallbackData = {
                buffer: channelsMixedData,
                start: nextSample,
                length: totalSamples,
                sampleRate: audioBuffer.sampleRate,
                isStart: nextSample === 0,
            };

            nextSample = nextSample + totalSamples - SPECTROGRAM_WINDOW_SIZE + SPECTROGRAM_WINDOW_OVERLAP;
            channelsMixedData = await bufferCallback(bufferCallbackData);
        }

        if (!isStopping && duration / audioBuffer.duration < 1.0) {
            setTimeout(
                audioEventCallback,
                ((SPECTROGRAM_WINDOW_OVERLAP / audioBuffer.sampleRate) * 1000) / 2
            );
        } else {
            source.disconnect(audioCtx.destination);
            audioEndCallback();
        }
    };
    audioEventCallback();

    // Play audio
    audioCtx.resume();
    source.start(0);

    // Return a function to stop rendering
    return () => {
        isStopping = true;
        source.disconnect(audioCtx.destination);
    };
}

const spectrogramCallbacksPromise = startRenderingSpectrogram();
let globalAudioCtx: AudioContext | null = null;

(async () => {
    const controlsContainer = document.querySelector('.controls');
    const {
        bufferCallback,
        clearCallback,
        updateRenderParameters,
    } = await spectrogramCallbacksPromise;
    if (controlsContainer !== null) {
        let stopCallback: (() => void) | null = null;
        const [setPlayState, recordingFinishedCallback] = initializeControlsUi(controlsContainer, {
            stopCallback: () => {
                if (stopCallback !== null) {
                    stopCallback();
                }
                stopCallback = null;
            },
            clearSpectrogramCallback: () => {
                clearCallback();
            },
            renderParametersUpdateCallback: (parameters: Partial<RenderParameters>) => {
                updateRenderParameters(parameters);
            },
            renderFromMicrophoneCallback: async () => {
                if (globalAudioCtx === null) {
                    globalAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
                }
                try {
                    stopCallback = await setupSpectrogramFromMicrophone(globalAudioCtx, bufferCallback, recordingFinishedCallback);
                    setPlayState('playing-from-mic');
                }catch(err) {
                    setPlayState('stopped');
                }
            },
            renderFromFileCallback: async (file: ArrayBuffer) => {
                if (globalAudioCtx === null) {
                    globalAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
                }
                try {
                    stopCallback = await setupSpectrogramFromAudioFile(globalAudioCtx, file, bufferCallback, () => setPlayState('stopped'));
                    setPlayState('playing-from-file');
                }catch(err) {
                    setPlayState('stopped');
                }
            },
        });
    }
})();
