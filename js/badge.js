Badge = global.Badge||{};
Badge.URL = Badge.URL||"http://www.espruino.com";
Badge.NAME = Badge.NAME||["Nodeconf","2018"]; // ISO10646-1 codepage
Badge.settings = {
  allowScan:true,// Allow scanning?
  location:true, // Send anonymous location data (needed for clapometer)
  clap:true      // Clapometer
};
// User-defined apps
Badge.apps = Badge.apps||{};
Badge.patterns = Badge.patterns||{};

var NC = require("nodeconfeu2018");
var BTNS = [BTN1,BTN2,BTN3,BTN4];
// Message types
var MSG = {
  CONTROL: 1,
  LED_COLOR: 2,
  MSG_ALERT: 5,
  MSG_INFO: 6,
  MSG_NOW1: 7,
  MSG_NOW2: 8,
  MSG_NEXT1: 9,
  MSG_NEXT2: 10
};
var BADGE_STATE = {
  SLEEPY: 1,
  ACTIVE_LISTENING: 2
};
var START_DATE = Date.parse('2018-01-01 00:00:00');
// --------------------------------------------
// Get Badge back to normal-ish
Badge.reset = () => {
 Pixl.menu();
 Badge.scan(0);
 Badge.setClapometer(0);
 Badge.pattern();
 clearInterval();
 clearWatch();
 Bluetooth.removeAllListeners();
 LoopbackB.removeAllListeners();
 g.clear();
 g.flip();
 Badge.updateBLE();
 if (Badge.defaultPattern) Badge.pattern(Badge.defaultPattern);
};
// --------------------------------------------
// The time since Unix Epoch as discovered from Bluetooth
Badge.bleDate = START_DATE;
// The time in secs from 'getTime' at which this time was discovered
Badge.bleDateTime = getTime();
// Current badge state according to adv data
Badge.bleState = BADGE_STATE.SLEEPY;
// The place in the conference we're at according to adv data
Badge.bleRoom = 0; // ROOMS.UNKNOWN
// Should the badge be connectable?
Badge.connectable = false;
// A list of old alerts/info we've received, so we don't do the same ones again
Badge.oldAlerts = [];
Badge.oldInfo = [];
// --------------------------------------------
// Bluetooth scanning - usually only done from Badge.menu
// Emit a BLEx event when the data received changes
Badge.bleData = []; // of Strings
Badge.scan = (on) => {
  on&=Badge.settings.allowScan;
  if (Badge.scanInterval) {
    clearInterval(Badge.scanInterval);
    delete Badge.scanInterval;
  }
  var interval = (Badge.bleState&BADGE_STATE.ACTIVE_LISTENING)?1100:60000;
  if (on)
    Badge.scanInterval = setInterval(()=>Badge.scanOnce(1), interval);
  Badge.scanOnce(on);
};
Badge.scanOnce = (on) => {
  // Whitelisted BLE broadcasters
  var WL = [
"b8:27:eb:31:6f:66 public",//gw
"b8:27:eb:b3:2a:b2 public",
"b8:27:eb:b6:af:fd public",
"b8:27:eb:8e:f9:73 public",
"b8:27:eb:db:4a:8b public",
"b8:27:eb:22:f2:0a public",
"b8:27:eb:95:3c:1b public",
"b8:27:eb:c2:ae:39 public",
"b8:27:eb:e3:d0:cf public",
"b8:27:eb:67:ee:83 public",
"b8:27:eb:e4:01:2c public",
"b8:27:eb:b3:24:00 public",
"b8:27:eb:5b:d3:29 public",
"b8:27:eb:61:7a:29 public",
"b8:27:eb:7e:0a:45 public",
"b8:27:eb:b0:13:4e public",
"b8:27:eb:8f:a0:c2 public",
"b8:27:eb:a2:4c:5d public",
"b8:27:eb:97:a8:52 public",
"b8:27:eb:95:12:18 public",
"b8:27:eb:8e:dc:f0 public",
"b8:27:eb:fb:ad:f7 public"
  ];

  on&=Badge.settings.allowScan;
  if (Badge.scanTimeout) {
    clearTimeout(Badge.scanTimeout);
    delete Badge.scanTimeout;
  }
  if (!on) // if not scanning, stop now
    return NRF.setScan();
  var b=[];
  Badge.scanTimeout = setTimeout(()=>{
    delete Badge.scanTimeout;
    NRF.setScan();
    for (var k in b) {
      var v = E.toString(new Uint8Array(b[k],1));
      if (Badge.bleData[k]!=v) {
        Badge.bleData[k]=v;
        Badge.emit("BLE"+k,v);
      }
    }
  }, 1000);
  NRF.setScan(d=>{var m=d.manufacturerData;
if (WL.indexOf(d.id)>=0&&m)b[m[0]]=m;},
  { filters: [{ manufacturerData:{0x0590:{}} }] });
};
Badge.getName = ()=>NRF.getAddress().substr(-5).replace(":", "");
Badge.updateBLE = ()=>{
  var data = {t: 0|E.getTemperature()};
  if (Badge.settings.clap) data.c=6;
  var adv={
    showName: Badge.connectable,
    connectable: Badge.connectable,
    interval: Badge.connectable?100:1000
  };
  if (!Badge.connectable) {
    adv.manufacturer=0x0590;
    adv.manufacturerData=JSON.stringify(data);
  }
  NRF.setAdvertising({}, adv);
  NRF.setServices(undefined,{uart:Badge.connectable});
  // No advertising at all if no location data
  if (!Badge.settings.location) {
    if (Badge.connectable) NRF.wake();
    else NRF.sleep();
  }
};
Badge.setClapometer = (on)=>{
  on&=Badge.settings.clap;
  if (Badge.clapWatch) clearWatch(Badge.clapWatch);
  delete Badge.clapWatch;
  if (Badge.clapInterval) clearInterval(Badge.clapInterval);
  delete Badge.clapInterval;

  Badge.clapCurrent=0;
  Badge.clapLast=0;

  var i = NC.i2c;
  if (on) {
    i.wa(0x20,0x9F); // 800Hz
    i.wa(0x30,0x20); // OR Z min/Z max
    i.wa(0x32,0x48); // 7 bit threshhold - 0x40 is 1G
    i.wa(0x33,0x7); // 7 bit duration
    i.wa(0x22,0x20); // AOI1 int on INT1
    Badge.clapWatch = setWatch(e=>{
      digitalPulse(LED,1,10);
      Badge.clapCurrent++;
    },D3,{repeat:true,edge:"rising"});
    Badge.clapInterval = setInterval(function() {
      Badge.clapLast = Badge.clapCurrent;
      Badge.clapCurrent = 0;
    }, 10000);
  } else {
    i.wa(0x20,0x5F); // 50Hz
    i.wa(0x30,0x00); // No sensing
  }
  var data = {t: 0|E.getTemperature()};
  if (Badge.settings.clap) data.c=0|Badge.clapLast;
  var adv={
    showName: Badge.connectable,
    connectable: Badge.connectable,
    interval: Badge.connectable?100:1000
  };
  if (!Badge.connectable) {
    adv.manufacturer=0x0590;
    adv.manufacturerData=JSON.stringify(data);
  }
  NRF.setAdvertising({}, adv);
  NRF.setServices(undefined,{uart:Badge.connectable});
  // No advertising at all if no location data
  if (!Badge.settings.location) {
    if (Badge.connectable) NRF.wake();
    else NRF.sleep();
  }
};
// --------------------------------------------
// Handle badge events
Badge.on('BLE'+MSG.CONTROL, msgData=>{
  var d = new DataView(E.toArrayBuffer(msgData));
  Badge.bleDate = START_DATE+d.getUint32(0,1)*1000;
  Badge.bleDateTime = getTime();
  var newState = d.getUint8(4);
  Badge.bleRoom = d.getUint8(5);
  /* If state changed, restart scan - it may
  need to be faster/slower */
  if (newState!=Badge.bleState) {
    Badge.bleState = newState;
    Badge.scan(1);
  }
});
Badge.on('BLE'+MSG.MSG_ALERT, msgData=>{
  if (Badge.oldAlerts.indexOf(msgData)>=0)
    return;
  Badge.oldAlerts = Badge.oldAlerts.slice(-2);
  Badge.oldAlerts.push(msgData);
  Badge.alert(msgData);
});
Badge.on('BLE'+MSG.MSG_INFO, msgData=>{
  if (Badge.oldInfo.indexOf(msgData)>=0)
    return;
  Badge.oldInfo = Badge.oldInfo.slice(-2);
  Badge.oldInfo.push(msgData);
  Badge.info(msgData);
});
Badge.on('BLE'+MSG.LED_COLOR, msgData=>{
  var d=E.toArrayBuffer(msgData);
  NC.ledTop(new Uint8Array(d,0,3));
  NC.ledBottom(new Uint8Array(d,3,3));
  NC.backlight(new Uint8Array(d,6,12));
});

// --------------------------------------------
// Fullscreen stuff
Badge.drawCenter = (txt,title,big) => {
  g.clear();
  g.setFontAlign(0,0);
  if (title) {
    g.fillRect(0,0,127,7);
    g.setColor(0);
    g.drawString(title,64,4);
    g.setColor(1);
  }
  var l = txt.split("\n");
  if (big) Badge.setBigFont(g);
  var h = big?10:6;
  l.forEach((s, i) => g.drawString(s, 64, 34+(i-(l.length-1)/2)*h));
  g.setFontBitmap();
  g.setFontAlign(-1,-1);
  g.flip();
};
Badge.alert = s => {
  Badge.reset();
  Badge.drawCenter(s,"Alert!",true/*big*/);
  Badge.pattern("red");
  BTNS.forEach(p=>setWatch(Badge.badge,p));
  function bzzt() {
    digitalPulse(VIBL,1,100);
    digitalPulse(VIBR,0,[120,100]);
  }
  bzzt();
  setInterval(bzzt,10000);
};
Badge.info = s => {
  Badge.reset();
  Badge.drawCenter(s,"Information",true/*big*/);
  Badge.pattern("info");
  BTNS.forEach(p=>setWatch(Badge.badge,p));
  // keep scanning in case there's an alert
  Badge.scan(1);
};
// https://raw.githubusercontent.com/Tecate/bitmap-fonts/master/bitmap/dylex/7x13.bdf
// ISO10646-1 codepage
Badge.setBigFont = g=>{
var font = atob("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");
var widths = atob("AwIEBgYIBwIEBAYGAwYCBgYGBgYHBgYGBgYCAwUGBQYIBwcHBwcGBwcEBgcGBwcHBgcHBwgHBwgHCAcEBgQGCAMGBgYGBgYGBgMFBgMIBgYGBgYGBgYGCAYGBgYCBggABwADBgQGBgYGBwcECAAHAAADAwUFBgYIBQgGBAgABggAAgYGCAgCBgQIBQYFAAgIBQYFBQMIBwQDBAUGBwcIBgcHBwcHBwgHBgYGBgQEBAQIBwcHBwcHBgcHBwcHCAYIBgYGBgYGCAYGBgYGAwMEBAYGBgYGBgYGBgYGBgYGBgY=");
g.setFontCustom(font, 32, widths, 13);
};
// align=-1=left,0,1=right
Badge.drawStringDbl = (txt,px,py,h,align)=>{
  var g2 = Graphics.createArrayBuffer(128,h,2,{msb:true});
  Badge.setBigFont(g2);
  var w = g2.stringWidth(txt);
  var c = (w+3)>>2;
  g2.drawString(txt);
  if (w>55) { // too wide - use 1x
    var img = g2.asImage();
    g.transparent=0;
    px -= (align+1)*w/2;
    g.drawImage(img,px,py+2);
    return;
  }
  px -= (align+1)*w;
  var img = {width:w*2,height:1,transparent:0,buffer:new ArrayBuffer(c)};
  var a = new Uint8Array(img.buffer);
  for (var y=0;y<h;y++) {
    a.set(new Uint8Array(g2.buffer,32*y,c));
    g.drawImage(img,px,py+y*2);
    g.drawImage(img,px,py+1+y*2);
  }
};
// --------------------------------------------
// Main menu
Badge.menu = () => {
 function wait(cb) { m = { move: cb, select: cb }; }
 var mainmenu = {
  "": { "title": "-- Your badge --" },
  "Back to Badge": Badge.badge,
  "About": ()=>{
   Badge.drawCenter(`-- Nodeconf 2018 --

with Espruino Pixl.js
www.espruino.com
`);
   wait(e => Badge.menu());
  },
  "Make Connectable": () => {
   Badge.drawCenter(`-- Now Connectable --

You can connect to this badge
with a BLE capable device. Go to
espruino.com/ide on a Web BLE
capable browser to start coding!

Name: Pixl.js ${Badge.getName()}
MAC: ${NRF.getAddress()}`);
   g.flip();
   wait(() => { Badge.connectable = false; Badge.updateBLE(); Badge.menu(); });
   Badge.connectable = true;
   Badge.updateBLE();
  },
 };
 for (var i in Badge.apps) mainmenu[i]=Badge.apps[i];
 Badge.reset();
 Pixl.menu(mainmenu);
};
Badge.badge = ()=>{
 Badge.reset();
 var timeout;
 var lastTime = Date.now();
 var toggle = false;
 var imgy = 0;

 var hexImage = Graphics.createImage(`
      ######
     #
     # #
    # # #  #
    #  ##  #
    #    # #
  ######  #
  #  #  # ##
 #    ####
#  #     #
# # ######
#  #     #
 #    ####
  #  #  # ##
  ######  #
    #    # #
    #  ##  #
    # # #  #
     # #
     #
`);
 hexImage.transparent = 0;

 function getTimeChar(ch) {
   var min = ch.charCodeAt()*10;
   return ((min/60)|0)+":"+("0"+min%60).substr(-2);
 }


 function draw(n) {
  var t = Date.now();
  var timeDiff = t-lastTime;
  lastTime = t;

  toggle=!toggle;

  // v scroll for rhs image
  imgy=(imgy+1)%21;
  // Work out notifications
  var notify = [];
  function addTalkInfo(m1,m2) {
    var msg1=Badge.bleData[m1], msg2=Badge.bleData[m2];
    if (msg1) {
      var msg = getTimeChar(msg1)+": "+msg1.substr(1);
      if (toggle && msg2 && msg1[0]==msg2[0])
        msg = getTimeChar(msg2)+": "+msg2.substr(1);
      notify.push(msg);
    }
  }
  addTalkInfo(MSG.MSG_NOW1, MSG.MSG_NOW2);
  addTalkInfo(MSG.MSG_NEXT1, MSG.MSG_NEXT2);

  g.clear();
  // Draw the Name
  var y = 20 + notify.length*3; // y offset
  var l = Badge.NAME;
  l.forEach((s, i) => Badge.drawStringDbl(s, 57, y+(i-(l.length-1)/2)*20,14,0));

  // Draw the hex image down the side
  for (var y=-imgy;y<63;y+=20)g.drawImage(hexImage,115,y);

  // Draw notifications
  if (notify.length) {
    var h = notify.length*6+2;
    g.setColor(0);
    g.fillRect(0,0,127,h);
    g.setColor(1);
    g.drawRect(0,0,127,h);
    notify.forEach((n,i)=>g.drawString(n,2,2+i*6));
  }
  // Draw the current time
  g.setFontAlign(-1,-1);
  var date = new Date(Badge.bleDate+getTime()-Badge.bleDateTime);
  var timeStr = date.toISOString().split("T")[1].substr(0,5);
  if (NC.getBatteryState().charging)
    timeStr+=" CHARGING";
  if (E.getAnalogVRef()<3.25)
    timeStr+=" LOW BATTERY";
  g.drawString(timeStr,0,59);
  // now write to the screen
  g.flip();
  var delay = 1000;
  if (timeout) clearTimeout(timeout);
  timeout = setTimeout(e => { timeout = undefined; draw(1); }, delay);
 }
 draw(0);
 setWatch(Badge.menu, BTN1);
 setWatch(Badge.menu, BTN4);
 setWatch(e => draw(-1), BTN2, { repeat: 1 });
 setWatch(e => draw(1), BTN3, { repeat: 1 });
 // start scanning for Bluetooth advertising
 Badge.scan(1);
 // Start clapometer
 Badge.setClapometer(1);
};
// --------------------------------------------
// Badge Applications (you can add your own)
Badge.apps["Map"] = function() {
  var mapImg =  {
  width : 128, height : 64, bpp : 1,
  transparent : 0,
  buffer : require("heatshrink").decompress(atob("AH4A/AAcD/4AD/ANGgP//wFCgkAh//+APFgESBoQBBhFEiAPID4YPLD6sUoAfMvkVB5AfFi/AH7cP4/0H5sAJ5I/EgA/GqtSD4x/OD44/JD7w/fio/11XyH51CH5wPBH5ofHV44fHF5IfM//D/4AF+A/KAAcTF5QADJ5IAFJ5YADP5YvEoBfF4QPGioPFgECH5wPHH48D//gGoSPIn7/BkAVCoCwBB4sgiQPgn48BB5gADB/4PIR4QADv/4WwwAPwAPdgfq93oB5cB5WkxAgMx2k5APMhQfOhXk9wMJA"))
};
  var ROOMS = [
  // [Name,X,Y]
["Unknown"],// 0,
["McCurdy 12",53,22], // 1,
["McCurdy 3",76,22], // 2,
["Maginnes",29,20], // 3,
["Preassembly",70,41],// 4,
["Lounge"],//  5,
["Hotel Bar"],// 6,
["Restaurant"],// 7,
["Hotel Checkin"],// 8,
["McCurdy 1",45,22],// 9,
["McCurdy 2",61,22],// 10,
["Preassembly 1",90,41],// 11,
["Maginnes 1",28,33],// 12,
["Reception",92,26] // 13
  ];

  Badge.reset();
  Badge.scan(1); // ensure up to date data

  var toggle = false;
  function draw() {
    g.clear();
    g.drawImage(mapImg);

    var room = ROOMS[Badge.bleRoom];
    if (room==undefined) room=["Unknown"];
    g.setFontAlign(0,-1);
    g.drawString(room[0],64,0);
    g.setFontAlign(-1,-1);

    toggle = !toggle;
    if (room.length>1) {
      if (toggle) g.fillCircle(room[1],room[2], 5);
      else g.drawCircle(room[1],room[2], 5);
    }
    g.flip();
  }
  draw();
  setInterval(draw,750);
  BTNS.forEach(p=>setWatch(Badge.menu,p));
};
Badge.apps["Backlight"] = ()=>{
 var menu = { "": { "title": "-- Select Backlight --" },
   "Back to Badge":Badge.badge };
 function bl(i) {
   return function() {
     Badge.defaultPattern=i;
     Badge.pattern(Badge.defaultPattern);
   };
 }
 menu.off=bl();
 for (var i in Badge.patterns) menu[i]=bl(i);
 Badge.defaultPattern=undefined;
 Badge.reset();
 Pixl.menu(menu);
};
Badge.apps["Privacy"] = firstRun=>{
 function toggle(setting) {
   return ()=>{
     Badge.settings[setting] = !Badge.settings[setting];
     Badge.apps.Privacy(firstRun);
   };
 }
 var menu = { "": { "title": "-- Privacy Settings --" } };
 if (firstRun) menu.Skip=Badge.badge;
 menu["Send Anon. Location : "+(Badge.settings.location?"Yes":"No")]=toggle("location");
 menu["Get Alerts/Info : "+(Badge.settings.allowScan?"Yes":"No")]=toggle("allowScan");
 menu["Clapometer : "+(Badge.settings.clap?"Yes":"No")]=toggle("clap");
 menu[firstRun?"Continue":"Back to Badge"]=()=>{
   require("Storage").write("settings", Badge.settings);
   Badge.bleData = []; // clear BLE data
   Badge.badge();
 };
 Badge.reset();
 Pixl.menu(menu);
};
Badge.apps["T-Rex"] = () => {
 Badge.reset();
 var IMG = {
  rex: [Graphics.createImage(`
           ########
          ##########
          ## #######
          ##########
          ##########
          ##########
          #####
          ########
#        #####
#      #######
##    ##########
###  ######### #
##############
##############
 ############
  ###########
   #########
    #######
     ### ##
     ##   #
          #
          ##
`),Graphics.createImage(`
           ########
          ##########
          ## #######
          ##########
          ##########
          ##########
          #####
          ########
#        #####
#      #######
##    ##########
###  ######### #
##############
##############
 ############
  ###########
   #########
    #######
     ### ##
     ##   ##
     #
     ##
`),Graphics.createImage(`
           ########
          #   ######
          # # ######
          #   ######
          ##########
          ##########
          #####
          ########
#        #####
#      #######
##    ##########
###  ######### #
##############
##############
 ############
  ###########
   #########
    #######
     ### ##
     ##   #
     #    #
     ##   ##
`)],
  cacti: [Graphics.createImage(`
     ##
    ####
    ####
    ####
    ####
    ####  #
 #  #### ###
### #### ###
### #### ###
### #### ###
### #### ###
### #### ###
### #### ###
### #### ###
###########
 #########
    ####
    ####
    ####
    ####
    ####
    ####
    ####
    ####
`),Graphics.createImage(`
   ##
   ##
 # ##
## ##  #
## ##  #
## ##  #
## ##  #
#####  #
 ####  #
   #####
   ####
   ##
   ##
   ##
   ##
   ##
   ##
   ##
`)],
 };
 IMG.rex.forEach(i=>i.transparent=0);
 IMG.cacti.forEach(i=>i.transparent=0);
 var cacti, rex, frame;

 function gameStart() {
  rex = {
   alive: true,
   img: 0,
   x: 10, y: 0,
   vy: 0,
   score: 0
  };
  cacti = [{ x: 128, img: 1 }];
  var random = new Uint8Array(128 * 3 / 8);
  for (var i = 0; i < 50; i++) {
   var a = 0 | (Math.random() * random.length);
   var b = 0 | (Math.random() * 8);
   random[a] |= 1 << b;
  }
  IMG.ground = { width: 128, height: 3, bpp: 1, buffer: random.buffer };
  frame = 0;
  setInterval(onFrame, 50);
 }
 function gameStop() {
  digitalPulse(VIBL,1,1000);
  digitalPulse(VIBR,1,1000);
  rex.alive = false;
  rex.img = 2; // dead
  clearInterval();
  setTimeout(() => setWatch(gameStart, BTN3), 1000);
  setTimeout(onFrame, 10);
 }

 function onFrame() {
  g.clear();
  if (rex.alive) {
   frame++;
   rex.score++;
   if (!(frame & 3)) rex.img = rex.img ? 0 : 1;
   // move rex
   if (BTN4.read() && rex.x > 0) rex.x--;
   if (BTN3.read() && rex.x < 20) rex.x++;
   if (BTN2.read() && rex.y == 0) {
     digitalPulse(VIBL,1,20);
     rex.vy = 4;
   }
   rex.y += rex.vy;
   rex.vy -= 0.2;
   if (rex.y <= 0) { rex.y = 0; rex.vy = 0; }
   // move cacti
   var lastCactix = cacti.length ? cacti[cacti.length - 1].x : 127;
   if (lastCactix < 128) {
    cacti.push({
     x: lastCactix + 24 + Math.random() * 128,
     img: (Math.random() > 0.5) ? 1 : 0
    });
   }
   cacti.forEach(c => c.x--);
   while (cacti.length && cacti[0].x < 0) cacti.shift();
  } else {
   g.drawString("Game Over!", (128 - g.stringWidth("Game Over!")) / 2, 20);
  }
  g.drawLine(0, 60, 127, 60);
  cacti.forEach(c => g.drawImage(IMG.cacti[c.img], c.x, 60 - IMG.cacti[c.img].height));
  // check against actual pixels
  var rexx = rex.x;
  var rexy = 38 - rex.y;
  if (rex.alive &&
   (g.getPixel(rexx + 0, rexy + 13) ||
   g.getPixel(rexx + 2, rexy + 15) ||
   g.getPixel(rexx + 5, rexy + 19) ||
   g.getPixel(rexx + 10, rexy + 19) ||
   g.getPixel(rexx + 12, rexy + 15) ||
   g.getPixel(rexx + 13, rexy + 13) ||
   g.getPixel(rexx + 15, rexy + 11) ||
   g.getPixel(rexx + 17, rexy + 7) ||
   g.getPixel(rexx + 19, rexy + 5) ||
   g.getPixel(rexx + 19, rexy + 1))) {
   return gameStop();
  }
  g.drawImage(IMG.rex[rex.img], rexx, rexy);
  var groundOffset = frame & 127;
  g.drawImage(IMG.ground, -groundOffset, 61);
  g.drawImage(IMG.ground, 128 - groundOffset, 61);
  g.drawString(rex.score, 127 - g.stringWidth(rex.score));
  g.flip();
 }
 gameStart();
 setWatch(Badge.menu, BTN1);
};
Badge.apps["Flappy Bird"] = () => {
 Badge.reset();
 var SPEED = 0.5;
 var BIRDIMG = Graphics.createImage(`

 ####
#    #
# ### #
# #  #
#    #
 ####

`);
 BIRDIMG.transparent=0;
 var birdy, birdvy;
 var wasPressed = false;
 var running = false;
 var barriers;
 var score;

 function newBarrier(x) {
  barriers.push({
   x1: x-5, x2: x+5,
   y: 10+Math.random()*(g.getHeight()-20),
   gap: 8
  });
 }

 function gameStart() {
  running = true;
  birdy = g.getHeight() / 2;
  birdvy = 0;
  barriers = [];
  newBarrier(g.getWidth() / 2);
  newBarrier(g.getWidth());
  score = 0;
  wasPressed = false;
  setInterval(onFrame, 50);
 }

 function gameStop() {
  running = false;
  clearInterval();
  setTimeout(() => setWatch(gameStart, BTN3), 1000);
  setTimeout(onFrame, 10);
 }

 function onFrame() {
  var buttonState = BTN2.read()||BTN3.read()||(NC.accel().z>0);

  g.clear();
  if (!running) {
   g.drawString("Game Over!", 25, 10);
   g.drawString("Score", 10, 20);
   g.drawString(score, 10, 26);
   g.flip();
   return;
  }

  if (buttonState && !wasPressed) {
   digitalPulse(VIBL,1,20);
   birdvy -= 2;
  }
  wasPressed = buttonState;

  score++;
  birdvy += 0.2;
  birdvy *= 0.8;
  birdy += birdvy;
  if (birdy > g.getHeight())
   return gameStop();
  // draw bird
  g.drawImage(BIRDIMG, 0, birdy - 4);
  // draw barriers
  barriers.forEach(b => {
   b.x1 -= SPEED;
   b.x2 -= SPEED;
   var btop = b.y - b.gap;
   var bbot = b.y + b.gap;
   g.drawRect(b.x1 + 1, -1, b.x2 - 2, btop - 5);
   g.drawRect(b.x1, btop - 5, b.x2, btop);
   g.drawRect(b.x1, bbot, b.x2, bbot + 5);
   g.drawRect(b.x1 + 1, bbot + 5, b.x2 - 1, g.getHeight());
   if (b.x1 < 6 && (birdy - 3 < btop || birdy + 3 > bbot))
    return gameStop();
  });
  while (barriers.length && barriers[0].x2 <= 0) {
   barriers.shift();
   newBarrier(g.getWidth());
  }

  g.flip();
 }
 gameStart();
 setWatch(Badge.menu, BTN1);
};
Badge.apps["Compass"] = ()=>{
 Badge.reset();
 var min,max;
 function op(a,b,fn) {
   if (!b) return a;
   return {x:fn(a.x,b.y),y:fn(a.y,b.y)};
 }
 function xy(a,r) {
   return {x:96+r*Math.sin(a),y:32-r*Math.cos(a)};
 }
 setInterval(()=>{
   var m=NC.mag();
   min=op(m,min,Math.min);
   max=op(m,max,Math.max);
   var c = op(max,min,(a,b)=>(a+b)/2);//centre
   var d = op(max,min,(a,b)=>a-b);//difference
   var diff = Math.sqrt(d.x*d.x+d.y*d.y);
   var ang = Math.atan2(m.x-c.x,m.y-c.y);
   if (ang<0) ang+=2*Math.PI;
   g.clear();
   if (diff<4000) g.drawString("Turn 360 degrees\nto calibrate", 0, 0);
   var p=xy(-ang,24);
   g.drawLine(96,32,p.x,p.y);
   g.setFontAlign(0,0);
   ["-N-","NE","E","SE","S","SW","W","NW"].map((t,a)=>{var p=xy(a*Math.PI/4-ang,28);g.drawString(t,p.x,p.y);});
   g.setFontAlign(-1,-1);
   g.flip();
 },50);
 BTNS.forEach(p=>setWatch(Badge.badge,p));
};
Badge.apps["Bluetooth Workshop"] = ()=>{
 var onConnect;
 function ble(fn) {
   Badge.connectable = true;
   Badge.updateBLE();
   Badge.drawCenter(`Now connectable!
Press any button to
exit.

Name: Pixl.js ${Badge.getName()}`,"Bluetooth");
   function exit() {
     if (onConnect) NRF.removeListener('connect',onConnect);
     Badge.connectable = false;
     Badge.updateBLE();
     digitalWrite([VIBL,VIBR],0);
     Badge.apps["Bluetooth Workshop"]();
   }
   BTNS.forEach(p=>setWatch(exit,p));
   fn();
 }
 var menu = { "": { "title": "-- BLE Workshop --" },
   "LED/Buzzer Control":()=>ble(()=>{
     NRF.setServices({
       "7b340000-105b-2b38-3a74-2932f884e90e" : {
         "7b340001-105b-2b38-3a74-2932f884e90e" : {
           writable : true,
           value : [0,0,0],
           maxLen : 3,
           onWrite : function(evt) {
             var d = new Uint8Array(evt.data);
             var c = [0|d[0],0|d[1],0|d[2]];
             NC.backlight(c.concat(c,c,c));
             NC.ledTop(c);
             NC.ledBottom(c);
             Terminal.println("LED "+d);
           },
         },
         "7b340002-105b-2b38-3a74-2932f884e90e" : {
           writable : true,
           value : [0,0],
           maxLen : 2,
           onWrite : function(evt) {
             var d = new Uint8Array(evt.data);
             analogWrite(VIBL,(0|d[0])/255);
             analogWrite(VIBR,(0|d[1])/255);
             Terminal.println("BUZZ "+d);
           }
         }
       }
     },{uart:false});
   }),
   "Accelerometer":()=>ble(()=>{
     NRF.setServices({
       "7b340000-105b-2b38-3a74-2932f884e90e" : {
         "7b340003-105b-2b38-3a74-2932f884e90e" : {
           readable : true,
           notify : true,
           value : [0,0,0]
         }
       }
     },{uart:false});
     var started = false;
     onConnect=()=>{
       if (started) return;
       started = true;
       setTimeout(()=>{
         setInterval(()=>{
           var accel = NC.accel();
           NRF.updateServices({
             "7b340000-105b-2b38-3a74-2932f884e90e" : {
               "7b340003-105b-2b38-3a74-2932f884e90e" : {
                 value : [accel.x*63,accel.y*63,accel.z*63],
                 notify: true
               }
             }
           });
         },200);
       }, 2000);
     };
     NRF.on('connect',onConnect);
   }),
   "Back to Badge":Badge.badge
 };
 Badge.reset();
 Pixl.menu(menu);
};

// --------------------------------------------
// LED patterns - each is [callback, period_in_ms]
Badge.patterns.simple=()=>{ var n=0;return [()=>{
  var c = [127,127,127];
  NC.backlight(c.concat(c,c,c));
},0];};
Badge.patterns.dim=()=>{ var n=0;return [()=>{
  var c = [31,31,31];
  NC.backlight(c.concat(c,c,c));
},0];};
Badge.patterns.dimrainbow=()=>{ var n=0;return [()=>{
  n += 0.02;
  var b = 0.05;
  NC.backlight(
    E.HSBtoRGB(n,1,b,1).concat(
    E.HSBtoRGB(n+0.1,1,b,1),
    E.HSBtoRGB(n+0.2,1,b,1),
    E.HSBtoRGB(n+0.3,1,b,1)
   ));
  NC.ledTop(E.HSBtoRGB(n+0.4,1,b,1));
  NC.ledBottom(E.HSBtoRGB(n+0.5,1,b,1));
},200];};
Badge.patterns.rainbow=()=>{ var n=0;return [()=>{
  n += 0.01;
  NC.backlight(
    E.HSBtoRGB(n,1,1,1).concat(
    E.HSBtoRGB(n+0.1,1,1,1),
    E.HSBtoRGB(n+0.2,1,1,1),
    E.HSBtoRGB(n+0.3,1,1,1)
   ));
  NC.ledTop(E.HSBtoRGB(n+0.4,1,1,1));
  NC.ledBottom(E.HSBtoRGB(n+0.5,1,1,1));
},50];};
Badge.patterns.hues=()=>{ var n=1000;var hues=[0,0.2,0.4];return [()=>{
  n += 1;
  if (n>10) {
    hues=hues.map(Math.random);
    n=0;
  }
  var c = E.HSBtoRGB(hues[0],1,1,1);
  NC.backlight(c.concat(c,c,c));
  NC.ledTop(E.HSBtoRGB(hues[1],1,1,1));
  NC.ledBottom(E.HSBtoRGB(hues[2],1,1,1));
},50];};
Badge.patterns.rave=()=>{ var n=0;return [()=> {
  n += 0.01;
  var d = new Uint8Array(18);
  E.mapInPlace(d,d,x=>Math.random()*2048 - 1792);
  NC.ledBottom(d); // hack to send to *all* LEDs
},50];};
Badge.patterns.lightning=()=>{ var n=0;return [()=> {
  var d = new Uint8Array(18);
  r = (0|(50*Math.random()))*3;
  d.set([255,255,255],r);// will silently set out of bounds most of the time
  NC.ledBottom(d); // hack to send to *all* LEDs
},20];};
Badge.patterns.red=()=>{ var n=0;return [()=>{
  n+=50;
  if (n>1536)n=0;
  NC.ledTop([0,0,Math.max(255-Math.abs(n-1024),0)]);
  NC.ledBottom([0,0,Math.max(255-Math.abs(n-1384),0)]);
  NC.backlight([0,0,Math.max(255-Math.abs(n-640),0),
                0,0,Math.max(255-Math.abs(n-512),0),
                0,0,Math.max(255-Math.abs(n-384),0),
                0,0,Math.max(255-Math.abs(n-256),0)]);
},50];};
Badge.patterns.info=()=>{ var n=0;return [()=>{
  n+=20;
  if (n>3072)n=0;
  var ca = Math.max(127-Math.abs(n-256),0);
  var cb = Math.max(127-Math.abs(n-384),0);
  var cl = 16+14*Math.sin(n*Math.PI*2/3072);
  NC.ledTop([cl,cl,cl]);
  NC.ledBottom([cl,cl,cl]);
  NC.backlight([cb,cb,cb,
                ca,ca,ca,
                ca,ca,ca,
                cb,cb,cb]);
},50];};
// Actually display a pattern
Badge.pattern = name => {
  NC.ledTop();
  NC.ledBottom();
  NC.backlight();
  if (Badge._pattern) clearInterval(Badge._pattern);
  delete Badge._pattern;
  if (Badge.patterns[name]) {
    var p = Badge.patterns[name]();
    if (p[1]) Badge._pattern = setInterval(p[0],p[1]);
    p[0]();
  }
};

// --------------------------------------------
// Run at boot...
NRF.on('connect',addr=>{
  Terminal.println(addr+" connected");
  // force highest connection interval - powere usage not too big a deal
  setTimeout(function() {
    try {NRF.setConnectionInterval(7.5); } catch (e) {}
  },1000);
});
NRF.on('disconnect',addr=>Terminal.println("BLE disconnected"));
// --------------------------------------------
// Run at boot...
function onInit() {

 Badge.drawCenter("Hold down BTN4 to\nenable connection.");
 // buzz after a delay to give stuff like the accelerometer a chance to init
 setTimeout(function() {
   digitalPulse(LED1,1,100);
   digitalPulse(LED2,0,[500,100]);
 },100);
 // flashy lights!
 var hue = -0.2;
 setTimeout(function anim() {
  hue+=0.1;
  var c = E.HSBtoRGB(hue,1,hue<=1,1);
  NC.backlight(c.concat(c,c,c));
  NC.ledTop(E.HSBtoRGB(hue,1,1,1));
  NC.ledBottom(E.HSBtoRGB(hue,1,1,1));
  if (hue<=1) setTimeout(anim,200);
 },250);
 // finally start up
 setTimeout(x=>{
   if (!BTN4.read()) {
     NRF.nfcURL(Badge.URL);
     loadSettings();
     //NRF.sleep();
   } else reset();
 },2500);
}
function loadSettings() {
  var firstLoad = false;
  try {
    var o = JSON.parse(require("Storage").read("settings"));
    for (var i in o)
      if ("boolean"==typeof o[i])
        Badge.settings[i]=o[i];
   } catch (e) {
    console.log("Failed to load settings.");
    firstLoad = true;
  }
  if (firstLoad) {
    Badge.apps.Privacy(true);
    Badge.defaultPattern="dimrainbow";
  } else Badge.badge();
}
