import React from 'react';
import ReactDOM from 'react-dom';

import generatePlaybackInfoLabel from './PlaybackInfoLabel';

export default function initializePlaybackInfoUi(container: Element) {
    const [PlaybackInfoLabel, setImportedFileName] = generatePlaybackInfoLabel();

    ReactDOM.render(<PlaybackInfoLabel/>, container);
    return setImportedFileName;
}