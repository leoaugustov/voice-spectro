import { makeStyles } from '@material-ui/core/styles';
import React, { useState, useEffect } from 'react';

const useStyles = makeStyles({
    label: {
        position: 'absolute',
        top: 0,
        fontWeight: 100,
        color: '#858585',
    }
});

export default function generatePlaybackInfoLabel(): [() => JSX.Element, (fileName: string) => void] {
    let setImportedFileNameExport: ((fileName: string) => void) | null = null;

    const PlaybackInfoLabel = () => {
        const classes = useStyles();
        const [importedFileName, setImportedFileName] = useState("");

        useEffect(() => {
            setImportedFileNameExport = setImportedFileName;
        }, [setImportedFileName]);

        return (
            <>
                {importedFileName && <div className={`simple-label ${classes.label}`}>{importedFileName}</div>}
            </>
        );
    }

    return [
        PlaybackInfoLabel,
        fileName => {
            if(setImportedFileNameExport) {
                setImportedFileNameExport(fileName);
            }else {
                throw new Error('Attempt to set imported file name value before component mount');
              }
        }
    ];
}