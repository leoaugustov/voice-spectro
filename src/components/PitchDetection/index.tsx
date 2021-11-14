import React from 'react';
import ReactDOM from 'react-dom';

import generateDetectedFundamentalFrequencyLabel from './DetectedFundamentalFrequencyLabel';

export default function initializePitchDetectionUi(container: Element) {
    const [DetectedFundamentalFrequencyLabel, setSamplesForPitchDetection] = generateDetectedFundamentalFrequencyLabel();

    ReactDOM.render(<DetectedFundamentalFrequencyLabel/>, container);
    return setSamplesForPitchDetection;
}