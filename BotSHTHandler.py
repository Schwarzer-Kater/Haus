import paho.mqtt.client as mqtt
from paho.mqtt.properties import Properties
from paho.mqtt.packettypes import PacketTypes
import time
import asyncio
from telegram import Update, Bot
from telegram.ext import ContextTypes, Updater, CommandHandler, ApplicationBuilder, MessageHandler, filters

version = "BotSHT - Version 1.1.3 - 2024-09-02"

client = None

temperaturAussen = None
luftfeuchtigkeitAussen = None
luftdruck = None
lichtwert = None
temperaturInnen = None
luftfeuchtigkeitInnen = None
temperaturGarage = None
countGarage = None

# Status der jeweiligen Verbindung
statusAussen = "unbekannt"
statusInnen = "unbekannt"
statusGarage = "unbekannt"

# Überwachung
garagentorOffen = None
garageMagnet = None



async def greeting(txt):
    bot = Bot("6672672618:AAGHCSR-hKABWGuZa5Mfg7KKOS4ZFpvAYkQ")
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
        asyncio.run(greeting("BotSHT - keine Verbindung zum " + sensor))
        geaendert = True
    if (wertJetzt != None) and (statusVorher != "verbunden"):
      if geaendert:
        asyncio.run(greeting("BotSHT - Verbindung zum " + sensor))
        geaendert = True

    
    return neuerStatus
            

def on_message(client, userdata, message):
    global temperaturAussen
    global luftfeuchtigkeitAussen
    global luftdruck
    global lichtwert
    global temperaturInnen
    global luftfeuchtigkeitInnen
    global temperaturGarage
    global countGarage
    global garagentorOffen
    global garageMagnet

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
    if message.topic == "/Garage/in/gcount":
        countGarage = msgReceived
    if message.topic == "/Garage/in/magnet":
        garageMagnet = int(msgReceived)
        if (int(msgReceived) == 1 and garagentorOffen) or (int(msgReceived) == 0 and not(garagentorOffen)):
            garagentorOffen = (int(msgReceived) == 0)
            print("Garagentor " + str(garagentorOffen))
            # asyncio.run(greeting("BotSHT - Garagentor " + ("offen" if garagentorOffen else "geschlossen")))
    if message.topic == "/Garage/in/bwrest":
        kreis = msgReceived.split("/")
        # asyncio.run(greeting("BotSHT - Bewaesserung " + msgReceived))
                

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

def mqtt_send(topic, payload):
    # properties=Properties(PacketTypes.PUBLISH)
    # properties.MessageExpiryInterval=30
    client.publish(topic, payload)


client = mqtt.Client("BotSHT")
client.on_message = on_message
client.on_connect = on_connect
client.connect("192.168.178.26")
client.loop_start()
client.subscribe("/ArbeitszimmerK/+/+/Ausgelesen")
client.subscribe("/Garage/in/+")
asyncio.run(greeting("Beginn " + version))

try:
    loop = asyncio.get_event_loop()
except RuntimeError as e:
    if str(e).startswith('There is no current event loop in thread'):
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    else:
        raise

async def tgAbout(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await context.bot.send_message(
        chat_id=update.effective_chat.id,
        text=version
    )

async def tgInfoInnen(update: Update, context: ContextTypes.DEFAULT_TYPE):
  await context.bot.send_message(
      chat_id=update.effective_chat.id,
      text="Innnen {}°C, {}%, {} hPa".format(temperaturInnen, luftfeuchtigkeitInnen, luftdruck)
  )

async def tgInfoAussen(update: Update, context: ContextTypes.DEFAULT_TYPE):
  await context.bot.send_message(
    chat_id=update.effective_chat.id,
    text="Aussen {}°C, {}%, {} hPa, {} lux".format(temperaturAussen, luftfeuchtigkeitAussen, luftdruck, lichtwert)
  )

async def tgInfoGarage(update: Update, context: ContextTypes.DEFAULT_TYPE):
  await context.bot.send_message(
    chat_id=update.effective_chat.id,
    text="Garage {}°C, Tor {} (#{})".format(temperaturGarage, garageMagnet, countGarage)
  )

async def tgBWKurz(update: Update, context: ContextTypes.DEFAULT_TYPE):
  mqtt_send("/Garage/out/BW", "8/8/30/30")
  await context.bot.send_message(
    chat_id=update.effective_chat.id,
    text="Bewässerung kurz gestartet"
  )

async def tgBWLang(update: Update, context: ContextTypes.DEFAULT_TYPE):
  mqtt_send("/Garage/out/BW", "15/15/60/60")
  await context.bot.send_message(
    chat_id=update.effective_chat.id,
    text="Bewässerung lang gestartet"
  )

async def tgBWLangBeete(update: Update, context: ContextTypes.DEFAULT_TYPE):
  mqtt_send("/Garage/out/BW", "0/0/60/60")
  await context.bot.send_message(
    chat_id=update.effective_chat.id,
    text="Bewässerung lang Beete und Böschung gestartet"
  )

async def tgBWStop(update: Update, context: ContextTypes.DEFAULT_TYPE):
  mqtt_send("/Garage/out/BW", "0/0/0/0")
  await context.bot.send_message(
    chat_id=update.effective_chat.id,
    text="Bewässerung gestoppt"
  )
async def tgHelp(update: Update, context: ContextTypes.DEFAULT_TYPE):
  await context.bot.send_message(
    chat_id=update.effective_chat.id,
    text="/infoInnen\n/infoAussen\n/infoGarage\n/bwStop\n/bwKurzStart\n/bwLangStart\n/bwLangBeeteStart\n"
  )



que = asyncio.Queue()
application = ApplicationBuilder().token('6672672618:AAGHCSR-hKABWGuZa5Mfg7KKOS4ZFpvAYkQ').build()
updater=Updater(application.bot, update_queue=que)
aboutHandler = CommandHandler('about', tgAbout)
application.add_handler(aboutHandler)
infoInnenHandler = CommandHandler('infoInnen', tgInfoInnen)
application.add_handler(infoInnenHandler)
infoAussenHandler = CommandHandler('infoAussen', tgInfoAussen)
application.add_handler(infoAussenHandler)
infoGarageHandler = CommandHandler('infoGarage', tgInfoGarage)
application.add_handler(infoGarageHandler)
bwStopHandler = CommandHandler('bwStop', tgBWStop)
bwKurzHandler = CommandHandler('bwKurzStart', tgBWKurz)
bwLangHandler = CommandHandler('bwLangStart', tgBWLang)
bwLangBeeteHandler = CommandHandler('bwLangBeeteStart', tgBWLangBeete)
application.add_handler(bwStopHandler)
application.add_handler(bwLangHandler)
application.add_handler(bwKurzHandler)
application.add_handler(bwLangBeeteHandler)
helpHandler = CommandHandler('help', tgHelp)
application.add_handler(helpHandler)

mqtt_send("/Datensammler/Version", version)

application.run_polling()

    
