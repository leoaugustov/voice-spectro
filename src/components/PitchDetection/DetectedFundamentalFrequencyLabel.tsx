import Tooltip from '@material-ui/core/Tooltip';
import { makeStyles } from '@material-ui/core/styles';
import React, { useState, useEffect } from 'react';
import PitchFinder from 'pitchfinder';

const useStyles = makeStyles({
    tooltip: {
        fontSize: '0.8em',
    },
    label: {
        position: 'absolute',
        top: 0,
        right: 0,
        fontWeight: 500,
        color: '#ffffff',
    }
});

export default function generateDetectedFundamentalFrequencyLabel(): [() => JSX.Element, (samples: Float32Array) => void, () => void] {
    const detectFundamentalFrequency = PitchFinder.DynamicWavelet();
    let setFundamentalFrequencyExport: ((fundamentalFrequency: number) => void) | null = null;

    const DetectedFundamentalFrequencyLabel = () => {
        const classes = useStyles();
        const [fundamentalFrequency, setFundamentalFrequency] = useState(0);

        useEffect(() => {
            setFundamentalFrequencyExport = setFundamentalFrequency;
        }, [setFundamentalFrequency]);

        return (
            <Tooltip title="A frequência fundamental do sinal" classes={{tooltip: classes.tooltip}} arrow>
                <div className={`simple-label ${classes.label}`}>{fundamentalFrequency.toFixed(0)} Hz</div>
            </Tooltip>
        );
    };

    return [
        DetectedFundamentalFrequencyLabel,
        samples => {
            if(setFundamentalFrequencyExport) {
                const detectedFrequency = detectFundamentalFrequency(samples);
                if(detectedFrequency) {
                    setFundamentalFrequencyExport(detectedFrequency);
                }
            }else {
              throw new Error('Attempt to set fundamental frequency value before component mount');
            }
        },
        () => {
            if(setFundamentalFrequencyExport) {
                setFundamentalFrequencyExport(0);
            }else {
                throw new Error('Attempt to clear fundamental frequency value before component mount');
            }
        }
    ];
}