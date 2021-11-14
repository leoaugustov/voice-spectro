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
        fontSize: '12px',
        fontWeight: 500,
        letterSpacing: '0.05em',
        padding: '6px 12px',
        color: '#ffffff',
        background: 'rgba(53, 53, 53, 0.75)',
        ['-webkitBackdropFilter']: 'blur(8px)',
        backdropFilter: 'blur(8px)',
        borderBottomRightRadius: '3px',
        boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.25)',
    }
});

export default function generareDetectedFundamentalFrequencyLabel(): [() => JSX.Element, (samples: Float32Array) => void] {
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
                <div className={classes.label}>{fundamentalFrequency.toFixed(0)} Hz</div>
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
              throw new Error('Attempt to set fundamental frequency valeu before component mount');
            }
        }
    ];
}