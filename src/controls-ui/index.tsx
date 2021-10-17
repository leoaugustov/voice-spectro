import React from 'react';
import ReactDOM from 'react-dom';

import { RenderParameters } from '../spectrogram-render';

import generateSettingsContainer, { PlayState } from './SettingsContainer';

export default function initializeControlsUi(
    container: Element,
    props: {
        stopCallback: () => void;
        clearSpectrogramCallback: () => void;
        renderParametersUpdateCallback: (settings: Partial<RenderParameters>) => void;
        renderFromMicrophoneCallback: () => void;
        renderFromFileCallback: (file: ArrayBuffer) => void;
    }
): [(playState: PlayState) => void, (recordedAudioFile: Blob) => void] {
    const [SettingsContainer, setPlayState, recordingFinishedCallback] = generateSettingsContainer();

    ReactDOM.render(
        <SettingsContainer
            onStop={props.stopCallback}
            onClearSpectrogram={props.clearSpectrogramCallback}
            onRenderParametersUpdate={props.renderParametersUpdateCallback}
            onRenderFromMicrophone={props.renderFromMicrophoneCallback}
            onRenderFromFile={props.renderFromFileCallback}
        />,
        container
    );

    return [setPlayState, recordingFinishedCallback];
}
