import React from 'react';
import ReactDOM from 'react-dom';

import DetectedFundamentalFrequencyLabel from './DetectedFundamentalFrequencyLabel';

export default function initializePitchDetectionUi(container: Element) {
    ReactDOM.render(<DetectedFundamentalFrequencyLabel/>, container);
}