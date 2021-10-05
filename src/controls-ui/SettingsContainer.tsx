import Button from '@material-ui/core/Button';
import CircularProgress from '@material-ui/core/CircularProgress';
import Divider from '@material-ui/core/Divider';
import Drawer from '@material-ui/core/Drawer';
import FormControl from '@material-ui/core/FormControl';
import IconButton from '@material-ui/core/IconButton';
import InputLabel from '@material-ui/core/InputLabel';
import MenuItem from '@material-ui/core/MenuItem';
import Paper from '@material-ui/core/Paper';
import ScopedCssBaseline from '@material-ui/core/ScopedCssBaseline';
import Select from '@material-ui/core/Select';
import Typography from '@material-ui/core/Typography';
import pink from '@material-ui/core/colors/pink';
import { ThemeProvider, createMuiTheme, makeStyles } from '@material-ui/core/styles';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import AudiotrackIcon from '@material-ui/icons/Audiotrack';
import ClearIcon from '@material-ui/icons/Clear';
import CloseIcon from '@material-ui/icons/Close';
import MicIcon from '@material-ui/icons/Mic';
import SettingsIcon from '@material-ui/icons/Settings';
import StopIcon from '@material-ui/icons/Stop';
import PauseIcon from '@material-ui/icons/Pause';
import React, {
    ChangeEvent,
    MouseEvent,
    useState,
    useEffect,
    useMemo,
    useRef,
    useCallback,
} from 'react';

import { GRADIENTS } from '../color-util';
import { Scale } from '../spectrogram';
import { RenderParameters } from '../spectrogram-render';

import generateLabelledSlider from './LabelledSlider';

const controlsTheme = createMuiTheme({
    palette: {
        type: 'dark',
        background: {
            default: '#101010',
            paper: '#222222',
        },
        primary: {
            main: '#ffffff',
        },
        secondary: pink,
    },
});

const useStyles = makeStyles((theme) => ({
    select: {
        width: '100%',
        marginBottom: theme.spacing(2),
    },
    sliderLabelContainer: {
        display: 'flex',
        justifyContent: 'space-between',
    },
    divider: {
        marginBottom: theme.spacing(2),
    },
    buttonContainer: {
        position: 'relative',
        marginBottom: theme.spacing(1),
    },
    buttonProgress: {
        color: pink[500],
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginTop: -12,
        marginLeft: -12,
    },
    lastButton: {
        marginBottom: theme.spacing(2),
    },
    closeButton: {
        marginTop: -theme.spacing(1.5),
        marginLeft: -theme.spacing(1.5),
        width: theme.spacing(6),
    },
    settingsHeader: {
        display: 'flex',
        justifyContent: 'flex-start',
    },
    settingsButton: {
        borderTopLeftRadius: theme.spacing(2),
        borderTopRightRadius: theme.spacing(2),
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
        padding: `${theme.spacing(1.5)}px ${theme.spacing(3)}px`,
    },
    settingsDrawer: {
        backgroundColor: 'transparent',
    },
    settingsDrawerInner: {
        borderTopLeftRadius: theme.spacing(2),
        borderTopRightRadius: theme.spacing(2),
        maxWidth: '300px',
        padding: theme.spacing(2),
        boxSizing: 'border-box',
        margin: `${theme.spacing(2)}px auto 0 auto`,
    },
}));

const formatHz = (hz: number) => {
    if (hz < 999.5) {
        return `${hz.toPrecision(3)} Hz`;
    }
    return `${(hz / 1000).toPrecision(3)} kHz`;
};

const formatPercentage = (value: number) => {
    return `${Math.floor(value * 100)}%`;
};

const isPlayingFromMic = (playState: PlayState) => {
    return playState === 'playing-from-mic' || playState === 'playing-from-mic-again';
}

export type PlayState = 'stopped' | 'paused' | 'loading-file' | 'loading-mic' | 'playing-from-mic' | 'playing-from-mic-again' | 'playing-from-file';

export interface SettingsContainerProps {
    onStop: () => void;
    onClearSpectrogram: () => void;
    onRenderParametersUpdate: (settings: Partial<RenderParameters>) => void;
    onRenderFromMicrophone: () => void;
    onRenderFromFile: (file: ArrayBuffer) => void;
}

export type SettingsContainer = (props: SettingsContainerProps) => JSX.Element;

function generateSettingsContainer(): [SettingsContainer, (playState: PlayState) => void] {
    let setPlayStateExport: ((playState: PlayState) => void) | null = null;

    const SettingsContainer = ({
        onStop,
        onClearSpectrogram,
        onRenderParametersUpdate,
        onRenderFromMicrophone,
        onRenderFromFile,
    }: SettingsContainerProps) => {
        const { current: defaultParameters } = useRef({
            sensitivity: 0.4,
            contrast: 0.35,
            zoom: 3,
            minFrequency: 10,
            maxFrequency: 4500,
            scale: 'linear' as Scale,
            gradient: 'Black to White',
        });

        const classes = useStyles();
        const isMobile = useMediaQuery('(max-width: 800px)');
        const [settingsOpen, setSettingsOpen] = useState(false);

        const openSettings = useCallback(() => setSettingsOpen(true), [setSettingsOpen]);
        const closeSettings = useCallback(() => setSettingsOpen(false), [setSettingsOpen]);

        const onInnerPaperClick = useCallback((e: MouseEvent) => e.stopPropagation(), []);

        const fileRef = useRef<HTMLInputElement | null>(null);

        const [playState, setPlayState] = useState<PlayState>('stopped');
        const [SensitivitySlider, setSensitivity] = useMemo(generateLabelledSlider, []);
        const [ContrastSlider, setContrast] = useMemo(generateLabelledSlider, []);
        const [ZoomSlider, setZoom] = useMemo(generateLabelledSlider, []);
        const [MinFrequencySlider, setMinFrequency] = useMemo(generateLabelledSlider, []);
        const [MaxFrequencySlider, setMaxFrequency] = useMemo(generateLabelledSlider, []);

        const onPlayMicrophoneClick = useCallback(() => {
            if(playState !== 'paused') {
                onClearSpectrogram();
                setPlayState('loading-mic');
            }
            onRenderFromMicrophone();
        }, [onRenderFromMicrophone, onClearSpectrogram, setPlayState, playState]);

        const onPlayFileClick = useCallback(() => {
            if (fileRef.current === null) {
                return;
            }
            fileRef.current.click();
        }, [fileRef]);

        const onFileChange = useCallback(() => {
            if (
                fileRef.current === null ||
                fileRef.current.files === null ||
                fileRef.current.files.length !== 1
            ) {
                return;
            }

            const file = fileRef.current.files[0];
            const reader = new FileReader();
            setPlayState('loading-file');
            reader.addEventListener('load', () => {
                if (fileRef.current !== null) {
                    fileRef.current.value = '';
                }

                if (reader.result instanceof ArrayBuffer) {
                    onClearSpectrogram();
                    onRenderFromFile(reader.result);
                } else {
                    setPlayState('stopped');
                }
            });
            reader.readAsArrayBuffer(file);
        }, [fileRef, setPlayState, onRenderFromFile, onClearSpectrogram]);

        const onStopClick = useCallback(() => {
            onStop();
            setPlayState(isPlayingFromMic(playState) ? 'paused' : 'stopped');
        }, [setPlayState, playState]);

        const onSensitivityChange = useCallback(
            (value: number) => {
                defaultParameters.sensitivity = value;
                const scaledValue = 10 ** (value * 3) - 1;
                onRenderParametersUpdate({ sensitivity: scaledValue });
                setSensitivity(formatPercentage(value));
            },
            [onRenderParametersUpdate, setSensitivity]
        );

        const onContrastChange = useCallback(
            (value: number) => {
                defaultParameters.contrast = value;
                const scaledValue = 10 ** (value * 6) - 1;
                onRenderParametersUpdate({ contrast: scaledValue });
                setContrast(formatPercentage(value));
            },
            [onRenderParametersUpdate, setSensitivity]
        );

        const onZoomChange = useCallback(
            (value: number) => {
                defaultParameters.zoom = value;
                onRenderParametersUpdate({ zoom: value });
                setZoom(formatPercentage(value));
            },
            [onRenderParametersUpdate, setSensitivity]
        );

        const onMinFreqChange = useCallback(
            (value: number) => {
                defaultParameters.minFrequency = value;
                onRenderParametersUpdate({ minFrequencyHz: value });
                setMinFrequency(formatHz(value));
            },
            [onRenderParametersUpdate, setSensitivity]
        );

        const onMaxFreqChange = useCallback(
            (value: number) => {
                defaultParameters.maxFrequency = value;
                onRenderParametersUpdate({ maxFrequencyHz: value });
                setMaxFrequency(formatHz(value));
            },
            [onRenderParametersUpdate, setSensitivity]
        );

        const onGradientChange = useCallback(
            (event: ChangeEvent<{ name?: string | undefined; value: unknown }>) => {
                if (typeof event.target.value === 'string') {
                    const gradientData = GRADIENTS.find((g) => g.name === event.target.value);
                    if (gradientData !== undefined) {
                        defaultParameters.gradient = gradientData.name;
                        onRenderParametersUpdate({ gradient: gradientData.gradient });
                    }
                }
            },
            [onRenderParametersUpdate]
        );

        const onClearSpectrogramClick = useCallback(() => {
            onClearSpectrogram();
            setPlayState('stopped');
        }, [setPlayState, onClearSpectrogram]);

        useEffect(() => {
            setPlayStateExport = (playState) => {
                setPlayState(previousPlayState => {
                    if (previousPlayState === 'paused' && playState === 'playing-from-mic') {
                        return 'playing-from-mic-again';
                    }
                    return playState;
                });
            };
        }, [setPlayState]);

        // Update all parameters on mount
        useEffect(() => {
            onSensitivityChange(defaultParameters.sensitivity);
            onContrastChange(defaultParameters.contrast);
            onZoomChange(defaultParameters.zoom);
            onMinFreqChange(defaultParameters.minFrequency);
            onMaxFreqChange(defaultParameters.maxFrequency);
            onRenderParametersUpdate({ scale: defaultParameters.scale });

            const gradientData = GRADIENTS.find((g) => g.name === defaultParameters.gradient);
            if (gradientData !== undefined) {
                onRenderParametersUpdate({ gradient: gradientData.gradient });
            }
        }, []);

        const content = (
            <>
                <div className={classes.buttonContainer}>
                    <Button
                        fullWidth
                        variant="contained"
                        color="primary"
                        onClick={onPlayMicrophoneClick}
                        startIcon={<MicIcon />}
                        disabled={playState !== 'stopped' && playState !== 'paused'}
                    >
                        {playState === 'paused' || playState === 'playing-from-mic-again' ? 'Retomar gravação' : 'Gravar do microfone'}
                    </Button>
                    {playState === 'loading-mic' && (
                        <CircularProgress size={24} className={classes.buttonProgress} />
                    )}
                </div>
                <input
                    type="file"
                    style={{ display: 'none' }}
                    accept="audio/x-m4a,audio/*"
                    onChange={onFileChange}
                    ref={fileRef}
                />
                <div className={classes.buttonContainer}>
                    <Button
                        fullWidth
                        variant="contained"
                        color="primary"
                        onClick={onPlayFileClick}
                        startIcon={<AudiotrackIcon />}
                        disabled={playState !== 'stopped' && playState !== 'paused'}
                    >
                        Tocar arquivo de áudio
                    </Button>
                    {playState === 'loading-file' && (
                        <CircularProgress size={24} className={classes.buttonProgress} />
                    )}
                </div>

                <Button
                    fullWidth
                    className={classes.lastButton}
                    variant="outlined"
                    color="secondary"
                    onClick={onStopClick}
                    startIcon={isPlayingFromMic(playState) || playState === 'paused' ? <PauseIcon/> : <StopIcon />}
                    disabled={playState !== 'playing-from-file' && ! isPlayingFromMic(playState)}
                >
                    {isPlayingFromMic(playState) || playState === 'paused' ? 'Pausar' : 'Parar'}
                </Button>

                <Divider className={classes.divider} />

                <SensitivitySlider
                    nameLabelId="sensitivity-slider-label"
                    nameLabel="Sensibilidade"
                    min={0}
                    max={1}
                    step={0.01}
                    defaultValue={defaultParameters.sensitivity}
                    onChange={onSensitivityChange}
                />
                <ContrastSlider
                    nameLabelId="contrast-slider-label"
                    nameLabel="Contraste"
                    min={0}
                    max={1}
                    step={0.01}
                    defaultValue={defaultParameters.contrast}
                    onChange={onContrastChange}
                />
                <ZoomSlider
                    nameLabelId="zoom-slider-label"
                    nameLabel="Zoom"
                    min={1}
                    max={10}
                    step={0.01}
                    defaultValue={defaultParameters.zoom}
                    onChange={onZoomChange}
                />
                <MinFrequencySlider
                    nameLabelId="min-freq-slider-label"
                    nameLabel="Frequência mínima"
                    min={0}
                    max={6000}
                    step={10}
                    defaultValue={defaultParameters.minFrequency}
                    onChange={onMinFreqChange}
                />
                <MaxFrequencySlider
                    nameLabelId="max-freq-slider-label"
                    nameLabel="Frequência máxima"
                    min={0}
                    max={6000}
                    step={10}
                    defaultValue={defaultParameters.maxFrequency}
                    onChange={onMaxFreqChange}
                />
                <FormControl className={classes.select}>
                    <InputLabel id="gradient-select-label">Cor</InputLabel>
                    <Select
                        labelId="gradient-select-label"
                        id="gradient-select"
                        defaultValue={defaultParameters.gradient}
                        onChange={onGradientChange}
                    >
                        {GRADIENTS.map((g) => (
                            <MenuItem value={g.name} key={g.name}>
                                {g.name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <Button
                    fullWidth
                    variant="text"
                    color="secondary"
                    onClick={onClearSpectrogramClick}
                    startIcon={<ClearIcon />}
                >
                    Limpar espectrograma
                </Button>
            </>
        );

        return (
            <ThemeProvider theme={controlsTheme}>
                <ScopedCssBaseline>
                    {isMobile ? (
                        <>
                            <Button
                                size="large"
                                className={classes.settingsButton}
                                variant="contained"
                                color="primary"
                                startIcon={<SettingsIcon />}
                                onClick={openSettings}
                                disableElevation
                            >
                                Configurações
                            </Button>
                            <Drawer
                                anchor="bottom"
                                open={settingsOpen}
                                onClose={closeSettings}
                                classes={{
                                    paperAnchorBottom: classes.settingsDrawer,
                                }}
                                PaperProps={{ elevation: 0, onClick: closeSettings }}
                            >
                                <Paper
                                    classes={{ root: classes.settingsDrawerInner }}
                                    elevation={16}
                                    onClick={onInnerPaperClick}
                                >
                                    <div className={classes.settingsHeader}>
                                        <IconButton
                                            aria-label="close"
                                            onClick={closeSettings}
                                            className={classes.closeButton}
                                        >
                                        <CloseIcon />
                                        </IconButton>
                                        <Typography variant="body1">Configurações</Typography>
                                    </div>
                                    {content}
                                </Paper>
                            </Drawer>
                        </>
                    ) : (
                        content
                    )}
                </ScopedCssBaseline>
            </ThemeProvider>
        );
    };

    return [
        SettingsContainer,
        (playState) => {
            if (setPlayStateExport !== null) {
                setPlayStateExport(playState);
            } else {
                throw new Error('Attempt to set play state before component mount');
            }
        },
    ];
}

export default generateSettingsContainer;
