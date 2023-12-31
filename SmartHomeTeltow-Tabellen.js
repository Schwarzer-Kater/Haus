// Information zu MQTT und Javascript gibt es dort:
// https://github.com/eclipse/paho.mqtt.javascript

var mqttConnected = 0
var mqtt;
const reconnectTimeout = 2000;
const host = "192.168.178.26";
const port = 8083;

var connectAussen = 0;
var connectInnen = 0;
var connectGateway = 0;
var connectGarage = 0;

// Logik für die HTML-Seite -------------------------------------------

// Richtet die Events ein
function connectEvents(full = true){
	if (full) {
		document.getElementById('Garage-Tor').addEventListener('click', garageTorTaster);
		["1", "2", "3", "4"].forEach(function(val, i, arr){
			document.getElementById("DauerKreis" + val + "Input").value = "0";
			// document.getElementById("DauerKreis" + val + "Output").value = "0";
			// document.getElementById("DauerKreis" + val + "Input").addEventListener('input', function(event) {
			// document.getElementById("DauerKreis" + val + "Output").value = event.target.value;
			// });
		});
	} else {
		document.getElementById("Bewaesserung-Kombination1").addEventListener('click', bewaesserungKomb1);
		document.getElementById("Bewaesserung-Kombination2").addEventListener('click', bewaesserungKomb2);
		document.getElementById("Bewaesserung-Kombination3").addEventListener('click', bewaesserungKomb3);
		document.getElementById("Bewaesserung-Kombination4").addEventListener('click', bewaesserungKomb4);
	};
    document.getElementById("Bewaesserung-Start").addEventListener('click', bewaesserungStart);
}

// Wertet die connect*-Variablen aus und schreibt das Ergebnis in die
// entsprechenden Felder
function updateStatus() {
    let upd = function(label, val) { 
		let el = document.getElementById(label);
		if (el) {
			// console.log("upd: (" + label + "):" + el);
			if (val === 0) {
				el.innerHTML = "nicht verbunden";
				el.classList.add("notConnected");
			} else {
				el.innerHTML = "verbunden";
				el.classList.remove("notConnected");
			};
		};
    };
    // console.log("upd: " + connectAussen + ", " + connectInnen + ", " + connectGateway + ", " + connectGarage);
    upd("status-aussen", connectAussen);
    upd("status-innen", connectInnen);
    // Too much traffic for Gateway
    // upd("status-Gateway", connectGateway);
    upd("status-Garage", connectGarage);
    connectAussen = connectInnen = connectGateway = connectGarage = 0;
    // console.log("upd beendet");
    window.setTimeout(updateStatus, 6000);
}

// gibt true zurück, wenn die übergebene Zeit von heute ist
function isToday(xtime) {
    let jetzt = new Date();
    return (xtime.getDate() === jetzt.getDate()) &&
		(xtime.getMonth() === jetzt.getMonth());
}

// gibt true zurück, wenn die übergebene Zeit von gestern ist
function isYesterday(xtime) {
    let gestern = new Date();
    gestern.setDate(gestern.getDate() - 1);
    return (xtime.getDate() === gestern.getDate()) &&
		(xtime.getMonth() === gestern.getMonth());
}

// Wird aufgerufen, wenn der Button Garage-Tor-Taster betätigt wird
function garageTorTaster(){
    console.log("Garage-Tor-Taster");
    if (mqttConnected === 0) {
		alert("Keine Verbindung zu MQTT!\nBefehl kann nicht gesendet werden.");
    } else {
		let message = new Paho.MQTT.Message("400");
		message.destinationName = "/Garage/out/Tor";
		mqtt.send(message);
    };
}

// Wird aufgerufen, wenn der Button Bewässerung starten betätigt wird
function bewaesserungStart(v1, v2, v3, v4){
    console.log("Bewässerung starten");
    if (mqttConnected === 0) {
		alert("Keine Verbindung zu MQTT!\nBefehl kann nicht gesendet werden.");
	} else if (connectGarage === 0) {
		alert("Keine Verbindung zur Garage!\nBefehl kann nicht gesendet werden.");
    } else {
		let txt;
		if (v4) {
			txt = v1 + "/" + v2 + "/" + v3 + "/" + v4;
		} else {
			txt = document.getElementById("DauerKreis1Input").value + "/";
			txt = txt + document.getElementById("DauerKreis2Input").value + "/";
			txt = txt + document.getElementById("DauerKreis3Input").value + "/";
			txt = txt + document.getElementById("DauerKreis4Input").value;
		};
		// console.log(txt);
		let message = new Paho.MQTT.Message(txt);
		message.destinationName = "/Garage/out/BW";
		mqtt.send(message);
    };
}

function bewaesserungKomb1() { bewaesserungStart(15, 15, 60, 60); }
function bewaesserungKomb2() { bewaesserungStart( 8,  8, 30, 30); }
function bewaesserungKomb3() { bewaesserungStart( 0,  0, 60, 60); }
function bewaesserungKomb4() { bewaesserungStart( 0,  0,  0, 60); }

// MQTT-Anbindung -----------------------------------------------

// Wird aufgerufen, wenn die MQTT-Verbindung verloren geht
function onConnectionLost() {
    console.log("connection lost");
    document.getElementById("status-mqtt").innerHTML = "Verbindung verloren";
    mqttConnected = 0;
}

// Wird aufgerufen, wenn der MQTT-Verbindungsaufbau gescheitert ist
function onFailure(message) {
    console.log("Failed");
    document.getElementById("status-mqtt").innerHTML = "Verbindungsfehler";
    setTimeout(MQTTconnect, reconnectTimeout);
}

// Wird aufgerufen, wenn eine MQTT-Nachricht eingetroffen ist
function onMessageArrived(message) {
    // out_msg = "Message received " + message.payloadString + "<br>";
    // out_msg = out_msg + "Message received Topic "
    //	+ message.destinationName;
    // console.log("Message received ",message.payloadString);
    // console.log(out_msg);
    // document.getElementById("messages").innerHTML = out_msg;
    let topic = message.destinationName.replaceAll("/", ":");
    if (topic.includes(":aussen:")) {
		connectAussen = 1;
    } else if (topic.includes(":innen:")) {
		connectInnen = 1;
    } else if (topic.includes(":Gateway:")) {
		connectGateway = 1; 
    } else if (topic.includes(":Garage:")) {
		connectGarage = 1;
    };
    // console.log(topic);
    let el = document.getElementById(topic);
    if (el) {
		// Dimension ergänzen
		let txt = message.payloadString;
		if (topic.includes("Unixzeit")){
			let zeit = new Date();
			zeit.setTime(txt + "000");
			txt = zeit.toLocaleTimeString();
			if (isToday(zeit)) {
				txt += ", heute";
			} else if (isYesterday(zeit)) {
				txt += ", gestern";
			} else {
				txt += " am " + zeit.toLocaleDateString();
			};
		} else if (topic.toUpperCase().includes("TEMPERATUR")) {
			txt += "°C";
		} else if (topic.includes("Luftfeuchte")) {
			txt += " %";
		} else if (topic.includes("Luftdruck")) {
			txt += " hPa";
		} else if (topic.includes("Lichtwert")) {
			txt += " lux";
		} else if (topic.includes("magnet")) {
			txt = (txt === "1" ? "geschlossen" : "geöffnet");
		};
		el.innerHTML = txt;
    } else {
		if (topic.includes("bwrest")) {
			let txt = message.payloadString;
			let status = "aktiv, noch "
			txt.split("/").forEach(function(val, i, arr){
				let el = document.getElementById("Kreis" + i);
				el.innerHTML = (val === "0" ? "aus" : status + val + " Minuten");
				if (val !== "0") {status = "wartet, geplant ";};
			});
		};
    };
    document.getElementById("stand").innerHTML = new Date();
	// console.log("Message finished ",message.destinationName);
}

// Wird aufgerufen, wenn eine MQTT-Verbindung aufgebaut wurde,
// ggf. auch nach einem Wiederaufbau
function onConnected(recon, url) {
    console.log(" in onConnected " + recon);
}

// Wird aufgerufen, wenn der MQTT-Verbindungsaufbau erfolgreich war
// Meldet sich an für die Topics
function onSuccess() {
    // Once a connection has been made, make a subscription and send a message.
    // document.getElementById("messages").innerHTML = "Connected to " + host + "on port " + port;
    mqttConnected = 1
    // document.getElementById("status").innerHTML = "Connected";
    console.log("on Connect " + mqttConnected);
    mqtt.subscribe("/ArbeitszimmerK/#");
    mqtt.subscribe("/Garage/#");
    document.getElementById("status-mqtt").innerHTML = "Verbindung aktiv";
}

// Baut am Anfang die MQTT-Verbindung auf
function MQTTconnect() {

    console.log("connecting to " + host + " " + port);
    let x = Math.floor(Math.random() * 10000);
    let cname = "controlform-" + x;
    mqtt = new Paho.MQTT.Client(host, port, cname);
    console.log("connecting " + cname + " to "+ host);
    let options = {
		timeout : 3,
		onSuccess : onSuccess,
		onFailure : onFailure,

    };
    mqtt.onConnectionLost = onConnectionLost;
    mqtt.onMessageArrived = onMessageArrived;
    mqtt.onConnected = onConnected;
    mqtt.connect(options);
    return false;
}
