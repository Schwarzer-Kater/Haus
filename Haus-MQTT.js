var connected_flag = 0
var mqtt;
var reconnectTimeout = 2000;
var host = "192.168.178.26";
var port = 8083;

var connectAussen = 0;
var connectInnen = 0;
var connectGateway = 0;
var connectGarage = 0;

function updateStatus() {
    var upd = function(label, val) { 
	var el = document.getElementById(label);
	console.log("upd: (" + label + "):" + el);
	if (val === 0) {
	    el.innerHTML = "nicht verbunden";
	    el.classList.add("notConnected");
	} else {
	    el.innerHTML = "verbunden";
	    el.classList.remove("notConnected");
	};	
    };
    console.log("upd: " + connectAussen + ", " + connectInnen + ", " + connectGateway + ", " + connectGarage);
    upd("status-innen", connectInnen);
    upd("status-Gateway", connectGateway);
    upd("status-Garage", connectGarage);
    upd("status-aussen", connectAussen);
    connectAussen = connectInnen = connectGateway = connectGarage = 0;
    console.log("upd beendet");
    window.setTimeout(updateStatus, 6000);
}

function onConnectionLost() {
    console.log("connection lost");
    document.getElementById("status").innerHTML = "Connection Lost";
    document.getElementById("messages").innerHTML = "Connection Lost";
    document.getElementById("status-mqtt").innerHTML = "Verbindung verloren";
    connected_flag = 0;
}
function onFailure(message) {
    console.log("Failed");
    document.getElementById("messages").innerHTML = "Connection Failed - Retrying";
    document.getElementById("status-mqtt").innerHTML = "Verbindungsfehler";
    setTimeout(MQTTconnect, reconnectTimeout);
}
function onMessageArrived(r_message) {
    out_msg = "Message received " + r_message.payloadString + "<br>";
    out_msg = out_msg + "Message received Topic "
	+ r_message.destinationName;
    // console.log("Message received ",r_message.payloadString);
    // console.log(out_msg);
    document.getElementById("messages").innerHTML = out_msg;
    var topic = r_message.destinationName.replaceAll("/", ":");
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
    var el = document.getElementById(topic);
    if (el) {
	// Dimension ergänzen
	var txt = r_message.payloadString;
	if (topic.includes("Unixzeit")){
	    var zeit = new Date();
	    var jetzt = new Date();
	    var gestern = new Date();
	    gestern.setDate(gestern.getDate() - 1);
	    zeit.setTime(txt + "000");
	    txt = zeit.toLocaleTimeString();
	    if ((zeit.getDate() === jetzt.getDate()) && (zeit.getMonth() === jetzt.getMonth())) {
		txt += ", heute";
	    } else if ((zeit.getDate() === gestern.getDate()) && (zeit.getMonth() === gestern.getMonth())) {
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
	    var txt = r_message.payloadString;
	    var status = "aktiv, noch "
	    txt.split("/").forEach(function(val, i, arr){
		var el = document.getElementById("Kreis" + i);
		el.innerHTML = (val === "0" ? "aus" : status + val + " Minuten");
		if (val !== "0") {status = "wartet, insgesamt ";};
	    });
	};
    };
    
}
function onConnected(recon, url) {
    console.log(" in onConnected " + reconn);
}
function onConnect() {
    // Once a connection has been made, make a subscription and send a message.
    document.getElementById("messages").innerHTML = "Connected to " + host
	+ "on port " + port;
    connected_flag = 1
    document.getElementById("status").innerHTML = "Connected";
    console.log("on Connect " + connected_flag);
    mqtt.subscribe("/ArbeitszimmerK/#");
    mqtt.subscribe("/Garage/#");
    document.getElementById("status-mqtt").innerHTML = "Verbindung aktiv";
}

function MQTTconnect() {

    console.log("connecting to " + host + " " + port);
    var x = Math.floor(Math.random() * 10000);
    var cname = "controlform-" + x;
    mqtt = new Paho.MQTT.Client(host, port, cname);
    console.log("connecting " + cname + " to "+ host);
    var options = {
	timeout : 3,
	onSuccess : onConnect,
	onFailure : onFailure,

    };

    mqtt.onConnectionLost = onConnectionLost;
    mqtt.onMessageArrived = onMessageArrived;
    //mqtt.onConnected = onConnected;

    mqtt.connect(options);
    return false;

}

function sub_topics() {
    document.getElementById("messages").innerHTML = "";
    if (connected_flag == 0) {
	out_msg = "<b>Not Connected so can't subscribe</b>"
	console.log(out_msg);
	document.getElementById("messages").innerHTML = out_msg;
	return false;
    }
    var stopic = document.forms["subs"]["Stopic"].value;
    console.log("Subscribing to topic =" + stopic);
    mqtt.subscribe(stopic);
    return false;
}

function send_message(msg, topic) {
    if (connected_flag == 0) {
	out_msg = "<b>Not Connected so can't send</b>"
	console.log(out_msg);
	document.getElementById("messages").innerHTML = out_msg;
	return false;
    }
    var value = msg.value;
    console.log("value= " + value);
    console.log("topic= " + topic);
    message = new Paho.MQTT.Message(value);
    message.destinationName = "house/" + topic;

    mqtt.send(message);
    return false;
}
