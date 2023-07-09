var mqttConnected = 0
var mqtt;
const reconnectTimeout = 2000;
const host = "192.168.178.26";
const port = 8083;

var connectAussen = 0;
var connectInnen = 0;
var connectGateway = 0;
var connectGarage = 0;

var tempInnen;  // Das canvas-Objekt
var tempInnenMax = null; // Die letzte Maximal-Temperatur
var tempInnenMin = null; // Die letzte Minimal-Temperatur
var tempAussen;  // Das canvas-Objekt
var tempAussenMax = null; // Die letzte Maximal-Temperatur
var tempAussenMin = null; // Die letzte Minimal-Temperatur

// Wird regelmäßig aufgerufen, wertet connect* Variablen aus
function updateStatus() {
    tempInnen.update({needle: connectInnen === 1});
    if (connectInnen === 0) {
	tempInnen.update({valueText: "---"});
    };
    tempAussen.update({needle: connectAussen === 1});
    if (connectAussen === 0) {
	tempAussen.update({valueText: "---"});
    };
		     
    connectAussen = connectInnen = connectGateway = connectGarage = 0;
    window.setTimeout(updateStatus, 6000);
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
//    mqtt.subscribe("/Garage/#");
//    document.getElementById("status-mqtt").innerHTML = "Verbindung aktiv";
}

// Wird aufgerufen, wenn die MQTT-Verbindung verloren geht
function onConnectionLost() {
    console.log("connection lost");
    mqttConnected = 0;
}

// Wird aufgerufen, wenn der MQTT-Verbindungsaufbau gescheitert ist
function onFailure(message) {
    console.log("Failed");
    setTimeout(MQTTconnect, reconnectTimeout);
}

// Wird aufgerufen, wenn eine MQTT-Nachricht eingetroffen ist
function onMessageArrived(message) {
    let topic = message.destinationName.replaceAll("/", ":");
    console.log("TOPIC: " + topic);
    if (topic.includes(":aussen:")) {
	connectAussen = 1;
	console.log("connectAussen: " + connectAussen);
    } else if (topic.includes(":innen:")) {
	connectInnen = 1;
	console.log("connectInnen: " + connectInnen);
    } else if (topic.includes(":Gateway:")) {
	connectGateway = 1; 
    } else if (topic.includes(":Garage:")) {
	connectGarage = 1;
    };
    if (topic === ":ArbeitszimmerK:innen:Temperatur2Info:Ausgelesen") {
	tempInnen.value = message.payloadString;
	tempInnen.update({valueText: message.payloadString.replaceAll(".", ",") + "°C"});
    } else if (topic === ":ArbeitszimmerK:innen:Temperatur2Info:Maximum"){
	tempInnenMax = message.payloadString;
    } else if (topic === ":ArbeitszimmerK:innen:Temperatur2Info:Minimum"){
	tempInnenMin = message.payloadString;
    } else if (topic === ":ArbeitszimmerK:aussen:TemperaturInfo:Ausgelesen") {
	tempAussen.value = message.payloadString;
	tempAussen.update({valueText: message.payloadString.replaceAll(".", ",") + "°C"});
    } else if (topic === ":ArbeitszimmerK:aussen:TemperaturInfo:Maximum"){
	tempAussenMax = message.payloadString;
    } else if (topic === ":ArbeitszimmerK:aussen:TemperaturInfo:Minimum"){
	tempAussenMin = message.payloadString;
    };
    if (tempInnenMin && tempInnenMax) {
	tempInnen.update({highlights:
			  [{from: -20,   to:  0,   color: "#33ffff"},
			   {from:  30,   to: 50,   color: "#ff3333"},
			   {from: tempInnenMin, to: tempInnenMax, color: "yellow"}]
			 });
    };
    if (tempAussenMin && tempAussenMax) {
	tempAussen.update({highlights:
			  [{from: -20,   to:  0,   color: "#33ffff"},
			   {from:  30,   to: 50,   color: "#ff3333"},
			   {from: tempAussenMin, to: tempAussenMax, color: "yellow"}]
			 });
    };

}	

// Baut am Anfang die MQTT-Verbindung auf
function MQTTconnect() {

    console.log("connecting to " + host + " " + port);
    let x = Math.floor(Math.random() * 10000);
    let cname = "SHT-Intrumente-" + x;
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



// definiert das Aussehen für die Temperatur innen
function initTempInnen() {
    tempInnen = new RadialGauge({
	renderTo: "tempInnenGauge",
	
	width: 300,
	height: 300,
	minValue: -20,
	maxValue: 50,
	value: 22.34,
	units: "",
	title: "innen",
	
	majorTicks: [-20,-10,0,10,20,30,40,50],
	minorTicks: 10,
	highlights: [{from: -20,   to:  0,   color: "#33ffff"},
		     {from:  30,   to: 50,   color: "#ff3333"}
		    ],
	colorNumbers: "black",
	colorPlate: "#eee",
	colorTitle: "black",
	colorValueBoxShadow: false,
	colorValueBoxRect: "#eee",
	colorValueBoxBackground: "#eee",

	needle: true,

	valueText: "22,34°C",
	valueBoxStroke: 0,
	valueInt: 1,
	valueDec: 2,
	
	borders: true,
	startAngle: 60,
	ticksAngle: 240
    });
}

// definiert das Aussehen für die Temperatur innen
function initTempAussen() {
    tempAussen = new RadialGauge({
	renderTo: "tempAussenGauge",
	
	width: 300,
	height: 300,
	minValue: -20,
	maxValue: 50,
	value: 22.34,
	units: "",
	title: "aussen",
	
	majorTicks: [-20,-10,0,10,20,30,40,50],
	minorTicks: 10,
	highlights: [{from: -20,   to:  0,   color: "#33ffff"},
		     {from:  30,   to: 50,   color: "#ff3333"}
		    ],
	colorNumbers: "white",
	colorPlate: "#111",
	colorTitle: "white",
	colorStrokeTicks: "#888",
	colorMinorTicks: "#888",
	colorValueText: "#eee",
	colorValueBoxShadow: false,
	colorValueBoxRect: "#111",
	colorValueBoxBackground: "#111",

	needle: true,

	valueText: "22,34°C",
	valueBoxStroke: 0,
	valueInt: 1,
	valueDec: 2,
	
	borders: true,
	startAngle: 60,
	ticksAngle: 240
    });
}

function initAll() {
    console.log("initAll");
    initTempInnen();
    tempInnen.draw();
    initTempAussen();
    tempAussen.draw();
    MQTTconnect();
    window.setTimeout(updateStatus, 2000);
}
