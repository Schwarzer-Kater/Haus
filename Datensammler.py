import paho.mqtt.client as mqtt
import time
import sqlite3
import asyncio
import telegram

temperaturAussen = None
luftfeuchtigkeitAussen = None
luftdruck = None
lichtwert = None
temperaturInnen = None
luftfeuchtigkeitInnen = None
temperaturGarage = None

# Status der jeweiligen Verbindung
statusAussen = "unbekannt"
statusInnen = "unbekannt"
statusGarage = "unbekannt"

# Überwachung
garagentorOffen = None


db = sqlite3.connect("wetter.db")
cursor = db.cursor();

def createDataBase():
    global db

    db.execute("""
    CREATE TABLE IF NOT EXISTS
    messwert(
    id INTEGER PRIMARY KEY,
    zeit INTEGER, 
    temperaturAussen REAL,
    luftfeuchtigkeitAussen REAL,
    luftdruck REAL,
    lichtwert REAL,
    temperaturInnen REAL,
    luftfeuchtigkeitInnen REAL,
    temperaturGarage REAL
    );""")
    db.execute("""
    CREATE TABLE IF NOT EXISTS
    status(
    id INTEGER PRIMARY KEY,
    zeit INTEGER,
    sensor TEXT,
    status TEXT
    );""")
    db.execute("""
    CREATE TABLE IF NOT EXISTS
    garagentor(
    id INTEGER PRIMARY KEY,
    zeit INTEGER,
    status TEXT
    );""")
    db.execute("""
    CREATE TABLE IF NOT EXISTS
    bewaesserung(
    id INTEGER PRIMARY KEY,
    zeit INTEGER,
    kreis1 INTEGER,
    kreis2 INTEGER,
    kreis3 INTEGER,
    kreis4 INTEGER
    );""")
    db.commit();

async def greeting(txt):
    bot = telegram.Bot("6672672618:AAGHCSR-hKABWGuZa5Mfg7KKOS4ZFpvAYkQ")
    async with bot:
        await bot.send_message(text = txt, chat_id = 6545971354)


def statusMeldung(sensor, wertJetzt, statusVorher, zeit):
    geaendert = False
    neuerStatus = ""
    if wertJetzt == None:
        neuerStatus = "ausgefallen"
    else:
        neuerStatus = "verbunden"
        
    if (wertJetzt == None) and (statusVorher != "ausgefallen"):
        asyncio.run(greeting("Datensammler - keine Verbindung zum " + sensor))
        geaendert = True
    if (wertJetzt != None) and (statusVorher != "verbunden"):
        asyncio.run(greeting("Datensammler - Verbindung zum " + sensor))
        geaendert = True

    if geaendert:
        db.execute("INSERT INTO status(zeit, sensor, status) VALUES(?,?,?)",
                   (int(zeit), sensor, neuerStatus))
        db.commit()
    
    return neuerStatus
            

def on_message(client, userdata, message):
    global temperaturAussen
    global luftfeuchtigkeitAussen
    global luftdruck
    global lichtwert
    global temperaturInnen
    global luftfeuchtigkeitInnen
    global temperaturGarage
    global garagentorOffen

    msgReceived = str(message.payload.decode("utf-8"))
    print("message topic=",message.topic)
    print("message received ", msgReceived)
    # print("message qos=",message.qos)
    # print("message retain flag=",message.retain)
    zeit = time.time()
    if message.topic == "/ArbeitszimmerK/aussen/TemperaturInfo/Ausgelesen":
        temperaturAussen = float(msgReceived);
    if message.topic == "/ArbeitszimmerK/aussen/LuftfeuchteInfo/Ausgelesen":
        luftfeuchtigkeitAussen = float(msgReceived)
    if message.topic == "/ArbeitszimmerK/aussen/LuftdruckInfo/Ausgelesen":
        luftdruck = float(msgReceived)
    if message.topic == "/ArbeitszimmerK/aussen/LichtwertInfo/Ausgelesen":
        lichtwert = float(msgReceived)
    if message.topic == "/ArbeitszimmerK/innen/Temperatur2Info/Ausgelesen":
        temperaturInnen = float(msgReceived)
    if message.topic == "/ArbeitszimmerK/innen/Luftfeuchte2Info/Ausgelesen":
        luftfeuchtigkeitInnen = float(msgReceived)
    if message.topic == "/Garage/in/temperatur":
        temperaturGarage = float(msgReceived)
    if message.topic == "/Garage/in/magnet":
        if (int(msgReceived) == 1 and garagentorOffen) or (int(msgReceived) == 0 and not(garagentorOffen)):
            garagentorOffen = (int(msgReceived) == 0)
            print("Garagentor " + str(garagentorOffen))
            db2 = sqlite3.connect("wetter.db")
            db2.execute("""
            INSERT INTO garagentor(zeit, status) VALUES(?,?)
            """, (int(zeit), ("offen" if garagentorOffen else "geschlossen")))
            db2.commit()
            db2.close()
            asyncio.run(greeting("Datensammler - Garagentor " + ("offen" if garagentorOffen else "geschlossen")))
    if message.topic == "/Garage/in/bwrest":
        kreis = msgReceived.split("/")
        db2 = sqlite3.connect("wetter.db")
        db2.execute("""
        INSERT INTO bewaesserung(zeit, kreis1, kreis2, kreis3, kreis4) VALUES(?,?,?,?,?)
        """, (int(zeit), int(kreis[0]), int(kreis[1]), int(kreis[2]), int(kreis[3]))
        )
        db2.commit()
        db2.close()
        asyncio.run(greeting("Datensammler - Bewaesserung " + msgReceived))
                

def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("MQTT connected")
    elif rc == 1:
        print("MQTT connection refused - incorrect protocol version")
    elif rc == 2:
        print("MQTT connection refused - invalid client identifier")
    elif rc == 3:
        print("MQTT connection refused - server unavailable")
    elif rc == 4:
        print("MQTT connection refused - bad username or password")
    elif rc == 5:
        print("MQTT connection refused - not authorised")    

client = mqtt.Client("DatenSammler")
client.on_message = on_message
client.on_connect = on_connect
client.connect("192.168.178.26")
client.loop_start()
client.subscribe("/ArbeitszimmerK/+/+/Ausgelesen")
client.subscribe("/Garage/in/+")
createDataBase()
asyncio.run(greeting("Beginn Datensammlung"))

while True:
    time.sleep(1 * 60)
    zeit = time.time()
    print("Zeit:", time.ctime(zeit), " == ", int(zeit))
    print("Temperatur aussen: ", temperaturAussen)
    print("Luftfeuchtigkeit aussen: ", luftfeuchtigkeitAussen)
    print("Luftdruck: ", luftdruck)
    print("Lichtwert: ", lichtwert)
    print("Temperatur innen", temperaturInnen)
    print("Luftfeuchtigkeit innen", luftfeuchtigkeitInnen)
    print("Temperatur Garage", temperaturGarage)
    db.execute("""
    INSERT INTO messwert(zeit, temperaturAussen, luftfeuchtigkeitAussen, luftdruck,
    lichtwert, temperaturInnen, luftfeuchtigkeitInnen, temperaturGarage) 
    VALUES(?,?,?,?,?,?,?,?)""", (int(zeit), temperaturAussen,
                                 luftfeuchtigkeitAussen, luftdruck,
                                 lichtwert, temperaturInnen,
                                 luftfeuchtigkeitInnen, temperaturGarage))
    db.commit()
    statusAussen = statusMeldung("Außensensor", temperaturAussen, statusAussen, int(zeit))
    statusInnen = statusMeldung("Innensensor", temperaturInnen, statusInnen, int(zeit))
    statusGarage = statusMeldung("Gateway Garage", temperaturGarage, statusGarage, int(zeit))

    temperaturAussen = None
    luftfeuchtigkeitAussen = None
    luftdruck = None
    lichtwert = None
    temperaturInnen = None
    luftfeuchtigkeitInnen = None
    temperaturGarage = None
    
    
client.loop_stop()
