import React, { useState, useEffect, useCallback } from "react";
import Webcam from "react-webcam";
//import useWebSocket from 'react-use-websocket';
import './App.css';

//const ws1 = new WebSocket("ws://localhost:1880/ws/faden");
const ws2 = new WebSocket("ws://localhost:1880/ws/image");
//const ws = new WebSocket("ws://104.45.89.24:1880/ws/prediction");

const colors = [
  {color: "#F5814F", names: ["Peronospora", "Falscher Mehltau"]},
  {color: "#F1C528", names: ["Oidium", "Echter Mehltau"]},
  {color: "#39C8BF", names: ["Wespen", "Insekten"]},
  {color: "#E984B4", names: ["Rebenpockenmilbe", "Blattgallmilbe", "Milben", "Reblaus"]},
  {color: "#61A0FF", names: ["Grauschimmel", "Botrytis"]},
  {color: "#B182FF", names: ["ESCA", "Rotpilz"]},
  {color: "none", names: ["Nichts", "Gesund"]}
  //{color: "none", names: ["Nichts"]}
]

const WebcamCapture = (props) => {
  const webcamRef = React.useRef(null);
  //const [image, setImage] = useState(null)

  const toggleStream = React.useCallback(() => {
    props.setStream(!props.stream)
  }, [props]);

  const capture = React.useCallback(async() => {
    const base64 = await fetch(webcamRef.current.getScreenshot())
    const img = await base64.blob()

    //setImage(img)
    ws2.send(img)
  }, [webcamRef]);

  useEffect(() => {
    ws2.onopen = () => {
      console.log("ws2 connected")
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if(props.stream) {
        //console.log("interval")
        capture()
      }
    }, 500);
  
    return () => clearInterval(interval);
  }, [props, capture]);

  return (
    <>
      <div style={{overflow: "hidden", height: 1, width: 1, position: "absolute", visibility: "hidden"}}>
        <Webcam audio={false} height={720} ref={webcamRef} screenshotFormat="image/jpeg" width={1280}
          videoConstraints={{
            width: 1280,
            height: 720,
            facingMode: "environment"
          }}
      /></div>
      <button onClick={toggleStream} style={{opacity: props.scan ? 1 : 0}} className={props.stream ? 'active' : null}>{props.stream ? 'Scan läuft...' : 'Scan starten'}</button>
    </>
  );
};

const App = () => {
  const [data, setData] = useState([]);
  const [list, setList] = useState([])
  const [stream, setStream] = useState(false)
  const [scan, setScan] = useState(true)
  const [nextPosition, setNextPosition] = useState(true)
  const [lastClass, setLastClass] = useState("Nichts")

  const progressMax = 4

  useEffect(() => {
    let list = []
    const caseNames = [...new Set(data.map(e => e.name))]

    for(const a of caseNames) {
      if(a !== "Gesund") {
        let listIndex = []

        for(const b of data) {
          if(b.name === a) {
            listIndex.push(data.indexOf(b))
          }
        }
        list.push({name: a, cases: data.filter(e => e.name === a).length, indexes: listIndex, color: data.find(e => e.name === a).color})
      }
    }

    setList(list)
  }, [data, setList]);

  //console.log(list)

  /*
  useEffect(() => {
    ws1.onopen = () => {
      console.log("ws1 connected")
    };
  }, []);
  */

  const addData = useCallback((result/*, pos*/) => {
    const currentClass = result.class
    console.log(currentClass)

    if(currentClass !== lastClass && currentClass !== "Becher" && currentClass !== "Nichts" && result.score >= 0.9) { /* && nextPosition === true*/
      setLastClass(currentClass)
      if(nextPosition === true) {
        setData((current) => [...current, {name: currentClass, probability: result.score, color: colors.find(item => item.names.includes(result.class)).color}])
        setNextPosition(false)
      }
    } else if(currentClass === "Becher") {
      setLastClass(currentClass)
      setNextPosition(true)
    }

    if(data >= progressMax) {
      setStream(false)
    }

    /*
    let pos = 0
    if(result.class !== "Nichts") {
      pos = 1
    }

    if(pos === nextPosition) {
      if(result.class !== "Nichts") {
        setData((current) => [...current, {name: result.class, probability: result.score, color: colors.find(item => item.names.includes(result.class)).color}])
      }

      if(nextPosition === 1) {
        setNextPosition(0)
      } else if(nextPosition === 0) {
        setNextPosition(1)
      }
    }
  */
  }, [lastClass, data, nextPosition]);

  useEffect(() => {
    ws2.onmessage = function (event) {
      const json = JSON.parse(event.data);
      // {detector: [{class: 'Milben', score: 0.6652169227600098}, ...], position: {class: '0', score: 0.9999990463256836}}

      if(stream) {
        addData(json[0])
      }
      
      /*
      if(json.detector.length > 0 && json.position !== undefined) {
        addData(json.detector[0], Number(json.position.class))
      }
      */
    };
  }, [addData, stream]);

  /*
  useEffect(() => {
    ws1.onmessage = function (event) {
      const json = JSON.parse(event.data);

      if(json[0].class === "Marker" && json[0].score >= 0.7 && !nextPosition) {
        console.log("nextPosition", nextPosition)
        setNextPosition(true)
      }
    };
  }, [nextPosition, setNextPosition, stream]);
  */

  const progressList = list.map(item =>
    <div className="info-container">
      <div key={list.indexOf(item)} className="info-item" style={{ borderLeftColor: item.color }}>
        <h2>{item.name}</h2>
        <br/>
        <p>Fälle: {data.filter(e => e.name === item.name).length}</p>
        <br/>
        {item.indexes.map(index =>
          <span>Rebe {index}. </span>
        )}
      </div>
    </div>
  );

  return (
    <div className="App">
      <WebcamCapture stream={stream} setStream={setStream} scan={scan}/>
      <ProgressBar data={data} stream={stream} setStream={setStream} scan={scan} setScan={setScan} progressMax={progressMax}/>
      <div className="result-list" style={{ opacity: scan ? 0 : 1 }} >
        {/*<h1>Es wurden { data.filter(index => index.name !== "Gesund").length } folgende Befälle in deinem Weinberg gefunden:</h1>*/}
        <h1>Es wurden folgende Befälle in deinem Weinberg gefunden:</h1>
        <div className="info-list">
          { progressList }
        </div>
      </div>
    </div>
  );
}

const ProgressBar = (props) => {
  const progressMax = props.progressMax
  const data = props.data;
  // {name: result.class, probability: result.score, color: ""}

  useEffect(() => {
    // wenn neue Daten reinkommen, überprüfe ob Prozess abgeschlossen
    if(data.length >= progressMax) {
      console.log("SCAN ABGESCHLOSSEN")
      props.setStream(false)
      
      setTimeout(() => {
        props.setScan(false)
      }, 2000)
    }
  }, [data, progressMax, props]);

  const progressItems = data.map(item =>
    <div key={data.findIndex(e => e === item)} className="case" style={{ width: `${100/progressMax}%`, backgroundColor: item.color }}>{item.name}</div>
  );

  return (
    <>
      <div className="progress-bar" style={{ display: props.scan ? "flex" : "none"}}>
        { progressItems }
        <div style={{ opacity: props.stream ? 1 : 0, width: props.stream ? 4 : 0}} className="current">
          <div className="line"></div>
          <img className="arrow" src={require('./Vector.png')} alt=""/>
        </div>
      </div>
    </>
  );
};

export default App;
