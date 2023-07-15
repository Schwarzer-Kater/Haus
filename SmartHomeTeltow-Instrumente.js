var mqttConnected = 0
var mqtt;
const reconnectTimeout = 2000;
const host = "192.168.178.26";
const port = 8083;

var connectAussen = 0;
var connectInnen = 0;
var connectGateway = 0;
var connectGarage = 0;

class Messwert {
	constructor(canvasId, unit, optionDefs, highlightDefs = null){
		let options = Object.assign({}, optionDefs);
		options.renderTo = canvasId;
		this.canvasObject = new RadialGauge(options);
		this.unit = unit;
		this.highlightDefaults = highlightDefs;
		this.wert = null;
		this.maximum = null;
		this.minimum = null;
	}

	draw = function() {
		this.canvasObject.draw();
	}

	colorDefs = function() {
		let a = this.highlightDefaults;
		if (this.minimum != undefined && this.maximum != undefined) {
			a = a.concat({from: this.minimum, to: this.maximum, color: "yellow"});
		};
		return a;
	}

	updateStatus = function(connected) {
		this.canvasObject.update({needle: connected === 1});
		if (connected === 0) {
			this.canvasObject.update({valueText: "---"});
			if (this.highlightDefaults) {
				this.canvasObject.update({highlights: this.highlightDefaults});
			};
		} else {
			if (this.wert) {
				this.canvasObject.value = this.wert;
				this.canvasObject.update({valueText: this.wert.replaceAll(".", ",") + this.unit});
			};
			if (this.maximum && this.minimum && this.highlightDefaults !== null) {
					this.canvasObject.update({highlights: this.colorDefs()});
			};
		};
	};
}

class MesswertLog extends Messwert {
	colorDefs = function() {
		let a = this.highlightDefaults;
		if (this.minimum != undefined && this.maximum != undefined) {
			let start = (this.minimum < 0.1) ? "0" : Math.log10(this.minimum);				
			a = a.concat({from: start, to: Math.log10(this.maximum), color: "yellow"});
		};
		return a;
	}

	updateStatus = function(connected) {
		this.canvasObject.update({needle: connected === 1});
		if (connected === 0) {
			this.canvasObject.update({valueText: "---"});
			if (this.highlightDefaults) {
				this.canvasObject.update({highlights: this.highlightDefaults});
			};
		} else {
			if (this.wert) {
				this.canvasObject.value = Math.log10(this.wert);
				this.canvasObject.update({valueText: this.wert.replaceAll(".", ",") + this.unit});
			};
			if (this.maximum && this.minimum && this.highlightDefaults !== null) {
					this.canvasObject.update({highlights: this.colorDefs()});
			};
		};
	};
}

var tempInnen;     // Temperatur innen
var tempAussen;    // Temperatur aussen
var tempGarage;    // Temperatur der Garage

var feuchteInnen;  // Luftfeuchtigkeit innen
var feuchteAussen; // Luftfeuchtigkeit aussen

var luftdruck;
var lichtwert;

// Farbdefinitionen für den Ring der Temperaturskalen
const tempGaugeHighlightDefaults =
	  [{from: -20, to: 50, color: "#eee"},         // helles Grau
	   {from: -20,   to:  0,   color: "#33ffff"},  // helles Blau
	   {from:  30,   to: 50,   color: "#ff3333"}   // helles Rot
	  ];

// Definitionen für die Temperaturskalen
const tempGaugeOptionsDefaults = {
	width: 300,
	height: 300,
	minValue: -20,
	maxValue: 50,
	value: 22.34,
	units: "",
	title: "innen",
	
	majorTicks: [-20,-10,0,10,20,30,40,50],
	minorTicks: 10,
	colorNumbers: "black",
	colorPlate: "#eee",
	colorTitle: "black",
	colorValueBoxShadow: false,
	colorValueBoxRect: "#eee",
	colorValueBoxBackground: "#eee",

	needle: true,

	valueText: "undefiniert",
	valueBoxStroke: 0,
	valueInt: 1,
	valueDec: 2,
	
	borders: true,
	startAngle: 60,
	ticksAngle: 240
};

// Farbdefinitionen für den Ring der Luftfeuchtigkeitskalen
const feuchteGaugeHighlightDefaults =
	  [{from: 0, to: 100, color: "#eee"},         // helles Grau
	   {from: 60,   to:  100,   color: "#ccffcc"},  // helles Grün
	   {from:  0,   to: 40,   color: "#ffffcc"}   // helles Gelb
	  ];

// Definitionen für die Luftfeuchteskalen
const feuchteGaugeOptionsDefaults = {
	width: 300,
	height: 300,
	minValue: 0,
	maxValue: 100,
	value: 56.78,
	units: "",
	title: "innen",
	
	majorTicks: [0,10,20,30,40,50,60,70,80,90,100],
	minorTicks: 10,
	colorNumbers: "black",
	colorPlate: "#eee",
	colorTitle: "black",
	colorValueBoxShadow: false,
	colorValueBoxRect: "#eee",
	colorValueBoxBackground: "#eee",

	needle: true,

	valueText: "undefiniert",
	valueBoxStroke: 0,
	valueInt: 1,
	valueDec: 2,
	
	borders: true,
	startAngle: 60,
	ticksAngle: 240
};

// Farbdefinitionen für den Ring der Luftdruckskala
const luftdruckGaugeHighlightDefaults =
	  [{from: 980, to: 1040, color: "#eee"},         // helles Grau
	   {from: 980,   to: 1000,   color: "#33ffff"},  // helles Blau
	   {from: 1020,   to: 1040,   color: "#ff3333"}   // helles Rot
	  ];

// Definitionen für die Luftdruckskala
const luftdruckGaugeOptionsDefaults = {
	width: 300,
	height: 300,
	minValue: 980,
	maxValue: 1040,
	value: 1013,
	units: "",
	title: "Luftdruck",
	
	majorTicks: [980,990,1000,1010,1020,1030,1040],
	minorTicks: 10,
	colorNumbers: "black",
	colorPlate: "#eee",
	colorTitle: "black",
	colorValueBoxShadow: false,
	colorValueBoxRect: "#eee",
	colorValueBoxBackground: "#eee",

	needle: true,

	valueText: "undefiniert",
	valueBoxStroke: 0,
	valueInt: 1,
	valueDec: 2,
	
	borders: true,
	startAngle: 30,
	ticksAngle: 300
};

// Farbdefinitionen für den Ring der Luftdruckskala
const lichtwertGaugeHighlightDefaults =
	  [{from: 0, to: 5, color: "#eee"},         // helles Grau
	   {from: 0,   to: 1,   color: "#333"},  // dunkles Grau
	   {from: 4,   to: 5,   color: "#ffffcc"}   // helles Gelb
	  ];

// Definitionen für die Luftdruckskala
const lichtwertGaugeOptionsDefaults = {
	width: 300,
	height: 300,
	minValue: 0,
	maxValue: 5,
	value: 2,
	units: "",
	title: "Lichtwert",
	
	majorTicks: ["0","10","100","1 000","10 000","100 000"],
	minorTicks: 2,
	colorNumbers: "black",
	colorPlate: "#eee",
	colorTitle: "black",
	colorValueBoxShadow: false,
	colorValueBoxRect: "#eee",
	colorValueBoxBackground: "#eee",

	needle: true,

	valueText: "undefiniert",
	valueBoxStroke: 0,
	valueInt: 1,
	valueDec: 2,
	
	borders: true,
	startAngle: 30,
	ticksAngle: 300
};


// Wird regelmäßig aufgerufen, wertet connect* Variablen aus
function updateStatus() {
	tempInnen.updateStatus(connectInnen);
	tempAussen.updateStatus(connectAussen);
	tempGarage.updateStatus(connectGarage);
	feuchteInnen.updateStatus(connectInnen);
	feuchteAussen.updateStatus(connectAussen);
	luftdruck.updateStatus(connectAussen);
	lichtwert.updateStatus(connectAussen);
	document.getElementById("stand").innerHTML = new Date();
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
    mqtt.subscribe("/Garage/#");
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
    // console.log("TOPIC: " + topic);
    if (topic.includes(":aussen:")) {
		connectAussen = 1;
		// console.log("connectAussen: " + connectAussen);
    } else if (topic.includes(":innen:")) {
		connectInnen = 1;
		// console.log("connectInnen: " + connectInnen);
    } else if (topic.includes(":Gateway:")) {
		connectGateway = 1; 
    } else if (topic.includes(":Garage:")) {
		connectGarage = 1;
    };
    if (topic === ":ArbeitszimmerK:innen:Temperatur2Info:Ausgelesen") {
		tempInnen.wert = message.payloadString;
    } else if (topic === ":ArbeitszimmerK:innen:Temperatur2Info:Maximum"){
		tempInnen.maximum = message.payloadString;
    } else if (topic === ":ArbeitszimmerK:innen:Temperatur2Info:Minimum"){
		tempInnen.minimum = message.payloadString;
    } else if (topic === ":ArbeitszimmerK:aussen:TemperaturInfo:Ausgelesen") {
		tempAussen.wert = message.payloadString;
    } else if (topic === ":ArbeitszimmerK:aussen:TemperaturInfo:Maximum"){
		tempAussen.maximum = message.payloadString;
    } else if (topic === ":ArbeitszimmerK:aussen:TemperaturInfo:Minimum"){
		tempAussen.minimum = message.payloadString;
    } else if (topic === ":Garage:in:temperatur") {
		tempGarage.wert = message.payloadString;
	} else if (topic === ":ArbeitszimmerK:innen:Luftfeuchte2Info:Ausgelesen") {
		feuchteInnen.wert = message.payloadString;
    } else if (topic === ":ArbeitszimmerK:innen:Luftfeuchte2Info:Maximum"){
		feuchteInnen.maximum = message.payloadString;
    } else if (topic === ":ArbeitszimmerK:innen:Luftfeuchte2Info:Minimum"){
		feuchteInnen.minimum = message.payloadString;
    } else if (topic === ":ArbeitszimmerK:aussen:LuftfeuchteInfo:Ausgelesen") {
		feuchteAussen.wert = message.payloadString;
    } else if (topic === ":ArbeitszimmerK:aussen:LuftfeuchteInfo:Maximum"){
		feuchteAussen.maximum = message.payloadString;
    } else if (topic === ":ArbeitszimmerK:aussen:LuftfeuchteInfo:Minimum"){
		feuchteAussen.minimum = message.payloadString;
	} else if (topic === ":ArbeitszimmerK:aussen:LuftdruckInfo:Ausgelesen") {
		luftdruck.wert = message.payloadString;
    } else if (topic === ":ArbeitszimmerK:aussen:LuftdruckInfo:Maximum"){
		luftdruck.maximum = message.payloadString;
    } else if (topic === ":ArbeitszimmerK:aussen:LuftdruckInfo:Minimum"){
		luftdruck.minimum = message.payloadString;
	} else if (topic === ":ArbeitszimmerK:aussen:LichtwertInfo:Ausgelesen") {
		lichtwert.wert = message.payloadString;
    } else if (topic === ":ArbeitszimmerK:aussen:LichtwertInfo:Maximum"){
		lichtwert.maximum = message.payloadString;
    } else if (topic === ":ArbeitszimmerK:aussen:LichtwertInfo:Minimum"){
		lichtwert.minimum = message.payloadString;
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
		onFailure : onFailure
    };
    mqtt.onConnectionLost = onConnectionLost;
    mqtt.onMessageArrived = onMessageArrived;
    mqtt.onConnected = onConnected;
    mqtt.connect(options);
    return false;
}



// definiert das Aussehen für die Temperatur innen
function initTempInnen() {
	tempInnen = new Messwert("tempInnenGauge", "°C",
							 tempGaugeOptionsDefaults,
							 tempGaugeHighlightDefaults);
}

// definiert das Aussehen für die Temperatur aussen
function initTempAussen() {
	let options = Object.assign({}, tempGaugeOptionsDefaults);
	options.title = "außen";
	options.colorNumbers = "white";
	options.colorPlate = "#111";
	options.colorTitle = "white";
	options.colorValueText = "#eee";
	options.colorValueBoxRect = "#111";
	options.colorValueBoxBackground = "#111";

	tempAussen = new Messwert("tempAussenGauge", "°C",
							  options,
							  tempGaugeHighlightDefaults);
}

// definiert das Aussehen für die Temperatur der Garage
function initTempGarage() {
	let options = Object.assign({}, tempGaugeOptionsDefaults);
	options.title = "Garage";
	options.colorNumbers = "white";
	options.colorPlate = "blue";
	options.colorTitle = "white";
	options.colorValueText = "#eee";
	options.colorValueBoxRect = "#111";
	options.colorValueBoxBackground = "blue";
	options.highlights = tempGaugeHighlightDefaults;
	
    tempGarage = new Messwert("tempGarageGauge", "°C",
							  options, null);
}

// definiert das Aussehen für die Luftfeuchte innen
function initFeuchteInnen() {
	feuchteInnen = new Messwert("feuchteInnenGauge", "%",
								feuchteGaugeOptionsDefaults,
								feuchteGaugeHighlightDefaults);
}

// definiert das Aussehen für die Luftfeuchte aussen
function initFeuchteAussen() {
	let options = Object.assign({}, feuchteGaugeOptionsDefaults);
	options.title = "außen";
	options.colorNumbers = "white";
	options.colorPlate = "#111";
	options.colorTitle = "white";
	options.colorValueText = "#eee";
	options.colorValueBoxRect = "#111";
	options.colorValueBoxBackground = "#111";

	feuchteAussen = new Messwert("feuchteAussenGauge", "%",
								 options,
								 feuchteGaugeHighlightDefaults);
}

// definiert das Aussehen für Luftdruck
function initLuftdruck() {
	luftdruck = new Messwert("luftdruckGauge", "hPa",
							 luftdruckGaugeOptionsDefaults,
							 luftdruckGaugeHighlightDefaults);
}

// definiert das Aussehen für den Lichtwert
function initLichtwert() {
	lichtwert = new MesswertLog("lichtwertGauge", "lux",
							 lichtwertGaugeOptionsDefaults,
							 lichtwertGaugeHighlightDefaults);
}


function initAll() {
    console.log("initAll");
    initTempInnen();
    tempInnen.draw();
    initTempAussen();
    tempAussen.draw();
	initTempGarage();
	tempGarage.draw();
	initFeuchteInnen();
	feuchteInnen.draw();
	initFeuchteAussen();
	feuchteAussen.draw();
	initLuftdruck();
	luftdruck.draw();
	initLichtwert();
	lichtwert.draw();
    MQTTconnect();
    window.setTimeout(updateStatus, 2000);
}
