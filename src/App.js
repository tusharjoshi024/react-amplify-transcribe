import React, {useState} from 'react';

import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'font-awesome/css/font-awesome.min.css';
import Amplify, {Storage, Predictions} from 'aws-amplify';
import {AmazonAIPredictionsProvider} from '@aws-amplify/predictions';

import awsconfig from './aws-exports';

import mic from 'microphone-stream';


Amplify.configure(awsconfig);
Amplify.addPluggable(new AmazonAIPredictionsProvider());


function SpeechToText(props) {
    const [response, setResponse] = useState("Press 'start recording' to begin your transcription. Press STOP recording once you finish speaking.")

    function AudioRecorder(props) {
        const [recording, setRecording] = useState(false);
        const [micStream, setMicStream] = useState();
        const [audioBuffer] = useState(
            (function () {
                let buffer = [];

                function add(raw) {
                    buffer = buffer.concat(...raw);
                    return buffer;
                }

                function newBuffer() {
                    console.log("resetting buffer");
                    buffer = [];
                }

                return {
                    reset: function () {
                        newBuffer();
                    },
                    addData: function (raw) {
                        return add(raw);
                    },
                    getData: function () {
                        return buffer;
                    }
                };
            })()
        );

        async function startRecording() {
            console.log('start recording');
            audioBuffer.reset();

            window.navigator.mediaDevices.getUserMedia({video: false, audio: true}).then((stream) => {
                const startMic = new mic();

                startMic.setStream(stream);
                startMic.on('data', (chunk) => {
                    var raw = mic.toRaw(chunk);
                    if (raw == null) {
                        return;
                    }
                    audioBuffer.addData(raw);

                });

                setRecording(true);
                setMicStream(startMic);
            });
        }

        async function stopRecording() {
            console.log('stop recording');
            const {finishRecording} = props;

            micStream.stop();
            setMicStream(null);
            setRecording(false);

            const resultBuffer = audioBuffer.getData();

            if (typeof finishRecording === "function") {
                finishRecording(resultBuffer);
            }

        }

        return (
            <div className="audioRecorder card-body align-content-center align-items-center text-center bg-light border-top border-dark">
                <div>
                    {recording && <button className="btn-lg btn-primary" onClick={stopRecording}>
                        <i className="fa fa-2x fa-microphone-slash"></i>
                    </button>}
                    {!recording && <button className="btn-lg btn-primary" onClick={startRecording}>
                        <i className="fa fa-2x fa-microphone"></i>
                    </button>}
                </div>
            </div>
        );
    }

    function convertFromBuffer(bytes) {
        setResponse('Converting text...');

        Predictions.convert({
            transcription: {
                source: {
                    bytes
                },
                // language: "en-US", // other options are "en-GB", "fr-FR", "fr-CA", "es-US"
            },
        }).then(({transcription: {fullText}}) => setResponse(fullText))
            .catch(err => setResponse(JSON.stringify(err, null, 2)))
    }

    return (
        <div className="Text card-body bg-light border-primary border-bottom border-right border-left">
            <div>
                <h4>Speech to text output</h4>
                <p>{response}</p>
                <AudioRecorder finishRecording={convertFromBuffer}/>

            </div>
        </div>
    );
}


function App() {
    return (
        <div className="App card">
            <div className="card-header bg-primary font-light"><h3>Transcribe Audio</h3></div>
            <SpeechToText/>
            <br/>
        </div>
    );
}

export default App;