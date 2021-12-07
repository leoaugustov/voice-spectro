import React from 'react';
import ReactDOM from 'react-dom';

import generateDetectedFundamentalFrequencyLabel from './DetectedFundamentalFrequencyLabel';

export default function initializePitchDetectionUi(container: Element): [(samples: Float32Array) => void, () => void] {
    const [
        DetectedFundamentalFrequencyLabel,
        setSamplesForPitchDetection,
        clearDetectedFundamentalFrequency
    ] = generateDetectedFundamentalFrequencyLabel();

    ReactDOM.render(<DetectedFundamentalFrequencyLabel/>, container);
    return [setSamplesForPitchDetection, clearDetectedFundamentalFrequency];
}