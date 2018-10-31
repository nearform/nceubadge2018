var NC = require("NC");

Badge = global.Badge||{};
Badge.URL = "http://www.espruino.com";
Badge.settings = {
  allowScan:true, // Allow scanning?
  location:true   // send anonymous location data (TODO)
};
// User-defined apps
Badge.apps = Badge.apps||{};
Badge.patterns = Badge.patterns||{};
Badge.badgeImages = Badge.badgeImages||[];
Badge.badgeImages.push({ width: 128, height: 64, bpp: 1,
 buffer: E.toArrayBuffer(atob("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcAAAAAAAAAAAAAAAAAAAP/gAAAAAAAAAAAAAAAAAP/+0AAAAAAAAAAAAAAAAAP+AHgAAAAAAAAAAAAAAAADQAAsAAAAAAAAAAAAAAAAAyAAFgAAAAAAAAAAAAAAAAOgAAvwAAAAAAAAAAAAAAABUD+F2AAAAAAAAAAAAAAAAS/D/4gAAAAAAAAAAAAAAAEv//nIAAAAAAAAAAAAAAABE/4BaAAAAAAAAAAAAAAAAQ8AAWh/wAAAAAGAAAAAAAEAAAFof8AAAAABgAAAAAABAAAByHAAAAAAAAAAAAAAAQAAAZhwB4bhtjmZweAAAAEAAAGwcA/H8fY5n+PwAAABAAABwH+MZznGOZznOAAAAQAAAYB/jgYZhjmcZhgAAAeAAAGAcAfGGYY5nGYYAAAHgAABgHAB5hmGOZxmGAAAB8AAAcBwCGc5hjmcZzgAAAPgAAHAf8/n8Yf5nGPwAAAB4AANwH/HxuGD2Zxh4AAAAfAH/wAAAAYAAAAAAAAAAADx//oAAAAGAAAAAAAAAAAAWf7eAAAABgAAAAAAAAAAAH+38AAAAAAAAAAAAAAAAAAB/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=="))});
Badge.hexImage = Graphics.createImage(`
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
Badge.hexImage.transparent = 0;
BTNS = [BTN1,BTN2,BTN3,BTN4];
// Message types received over BLE
var MSG = {
  CONTROL: 1,
  LED_COLOR: 2,
  MSG_NEXT: 3,
  MSG_NOW: 4,
  MSG_ALERT: 5,
  MSG_INFO: 6
};
var START_DATE = Date.parse('2018-01-01 00:00:00');
// Whitelisted BLE broadcasters
var WHITELIST = [
  "b8:27:eb:31:6f:66 public",
];
// How often to scan in millisecs
var SCAN_INTERVAL = 60000;
// How long do we show now/next info on the badge?
var NOWNEXT_TIMEOUT = 12000;
// --------------------------------------------
// Get Badge back to normal-ish
Badge.reset = () => {
 Pixl.menu();
 Badge.scan(0);
 Badge.pattern();
 clearInterval();
 clearWatch();
 Bluetooth.removeAllListeners();
 LoopbackB.removeAllListeners();
 g.clear();
 g.flip();
 if (Badge.defaultPattern) Badge.pattern(Badge.defaultPattern);
};
// --------------------------------------------
// List of notifications to show
Badge.notifications = [ /* { text: ..., time: msecs } */];
// The time since Unix Epoch as discovered from Bluetooth
Badge.bleDate = START_DATE;
// The time in secs from 'getTime' at which this time was discovered
Badge.bleDateTime = getTime();
// Current badge state according to adv data
Badge.bleState = 0;
// The place in the conference we're at according to adv data
Badge.bleRoom = 0; // ROOMS.UNKNOWN
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
  if (on)
    Badge.scanInterval = setInterval(()=>Badge.scanOnce(1), SCAN_INTERVAL);
  Badge.scanOnce(on);
};
Badge.scanOnce = (on) => {
  on&=Badge.settings.allowScan;
  if (Badge.scanTimeout) {
    clearTimeout(Badge.scanTimeout);
    delete Badge.scanTimeout;
  }
  if (!on) // if not scanning, stop now
    return NRF.setScan();
  var d = [];
  packets = 0;
  Badge.scanTimeout = setTimeout(()=>{
    delete Badge.scanTimeout;
    NRF.setScan();
    for (var k in d) {
      if (Badge.bleData[k]!=d[k]) {
        Badge.bleData[k] = d[k];
        Badge.emit("BLE"+k,d[k]);
      }

    }
  }, 1000);
  NRF.setScan(device => {
    var m = device.manufacturerData;
    if (WHITELIST.indexOf(device.id)<0 || !m) return;
    packets++;
    d[m[0]] = E.toString(new Uint8Array(m,1));
  }, { filters: [{ manufacturerData:{0x0590:{}} }] });
};
Badge.getName = ()=>NRF.getAddress().substr(-5).replace(":", "");
// --------------------------------------------
// Handle badge events
Badge.on('BLE'+MSG.CONTROL, msgData=>{
  var d = new DataView(E.toArrayBuffer(msgData));
  Badge.bleDate = START_DATE+d.getUint32(0,1)*1000;
  Badge.bleDateTime = getTime();
  Badge.bleState = d.getUint8(4);
  Badge.bleRoom = d.getUint8(5);
});
Badge.on('BLE'+MSG.MSG_ALERT, msgData=>{
  Badge.alert(msgData);
});
Badge.on('BLE'+MSG.MSG_INFO, msgData=>{
  Badge.info(msgData);
});
Badge.on('BLE'+MSG.MSG_NOW, msgData=>{
  Badge.notifications.push({text:"NOW: "+msgData, time:NOWNEXT_TIMEOUT});
});
Badge.on('BLE'+MSG.MSG_NEXT, msgData=>{
  Badge.notifications.push({text:"NEXT: "+msgData, time:NOWNEXT_TIMEOUT});
});

// --------------------------------------------
// Fullscreen stuff
Badge.drawCenter = (txt,title) => {
  g.clear();
  g.setFontAlign(0,0);
  if (title) {
    g.fillRect(0,0,127,7);
    g.setColor(0);
    g.drawString(title,64,4);
    g.setColor(1);
  }
  var l = txt.split("\n");
  l.forEach((s, i) => g.drawString(s, 64, 34+(i-l.length/2)*6));
  g.setFontAlign(-1,-1);
  g.flip();
};
Badge.alert = s => {
  Badge.reset();
  Badge.drawCenter(s,"Alert!");
  Badge.pattern("red");  
  BTNS.forEach(p=>setWatch(Badge.badge,p));
  function bzzt() {
    digitalPulse(VIBL,1,100);
    digitalPulse(VIBR,0,[100,100]);
  }
  bzzt();
  setInterval(bzzt,10000);
};
Badge.info = s => {
  Badge.reset();
  Badge.drawCenter(s,"Information");
  Badge.pattern("info");  
  BTNS.forEach(p=>setWatch(Badge.badge,p));
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
   wait(() => { NRF.sleep(); Badge.menu(); });
   NRF.wake();
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
 var counter = 0;
 var imgy = 0;
  
 function draw(n) {
  var t = Date.now();
  var timeDiff = t-lastTime;
  lastTime = t;
   
  counter += n ? n : 0;
  if (counter < 0) counter = Badge.badgeImages.length - 1;
  if (counter >= Badge.badgeImages.length) counter = 0;
   
  imgy++;
  if (imgy>20)imgy=0;
   
  g.clear();
  // Draw the badge image
  var img = Badge.badgeImages[counter];
  g.drawImage(img, (115-img.width)/2, (64-img.height)/2);
  // Draw the hex image down the side
  for (var y=-imgy;y<63;y+=20)g.drawImage(Badge.hexImage,115,y);
  // remove any old notifications
  Badge.notifications = Badge.notifications.filter(n=>(n.time-=timeDiff)>0);
  // Draw notifications
  if (Badge.notifications.length) {
    var h = Badge.notifications.length*6+2;
    g.setColor(0);
    g.fillRect(0,0,127,h);
    g.setColor(1);
    g.drawRect(0,0,127,h);
    Badge.notifications.forEach((n,i)=>g.drawString(n.text,2,2+i*6));
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
};

// --------------------------------------------
// Badge Applications (you can add your own)
Badge.apps["Map"] = function() {
  var mapImg =  {
  width : 128, height : 64, bpp : 1,
  transparent : 0,
  buffer : E.toArrayBuffer(atob("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA///////+AAAAAAAAAAB//4AAAAEAA//8AAAAAAAAQASAAQABAAIRBAAAAAAAAEAEgAAAAQACEQQAAAAAAABABIABAAEAAhEEAAAAAAAAQASAAAABAAIRBRAAAAAAAEAEgAEAAQACHwVQAAAAAABABIAAAAEAAhEF8AAAAAAAQASAAQABAAIRBAAAAAAAAEAEgAAAAQAD8f0QAAAAAABABIABAAEAAgAFEAAAAAAAQASAAAABAAIABfAAAAAAAFVUgAEAAQACAAQAAAAAAABABIAAAAEAAgAF8AAAAAAAQASAAQABAAIABQAAAAAAAEAEgAAAAQACAAXwAAAAAABABIABAAEAAgAEAAAAAAAAQASAAAABAAIABfAAAAAAAEAEgAEAAQACAAVAAAAAAABABIAAAAEAAgAF8AAAAAAAQASAAQABAAIABAAAAAAAAEAEgAAAAQACAAXwAAAAAABqvIABAAEAAgAFQAAAAAAAQBCAAAABAAIABfAAAAAAAEAQgAEAAQACAAQAAAAAAABAEIAAAAEAAgAFAAAAAAAAQBCAAQABAAIABfAAAAAAAEAQgAAAAQACAAUAAAAAAAB/8P/////////8AAAAAAAAQBCAAAAAAAAABPAAAAAAAEAQgAAAAAAAAAUAAAAAAABAEIAAAAAAAAAF8AAAAAAAQBCAAAAAAAAABAAAAAAAAEAQgAAAAAAAAAUQAAAAAAB/8IAAAAAAAAAFUAAAAAAAQACAAAAAAAAABfAAAAAAAEAAgAAAAAAAAAQAAAAAAABAAP/4AAB////8AAAAAAAAT/yACAAAQBACAAAAAAAAAEgEgAgAAEAQAgAAAAAAAABIBIAIAABAEAIAAAAAAAAASASAD///wBACAAAAAAAAAEgEgAAAAAAQAgAAAAAAAABIBIAAAAAAEAIAAAAAAAAASASAAAAAABACAAAAAAAAAEgEgAAAAAAQAgAAAAAAAABIBIAAAAAAEAIAAAAAAAAAT/yAAAAAAB/+AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAPq7ugAAAAAAAAAAAAAAAAByqSIAAAAAAAAAAAAAAAAAI6kyAAAAAAAAAAAAAAAAAAKpIgAAAAAAAAAAAAAAAAACuTuAAAAAAAAAAAAAA=="))
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
    
    var room = S
    [Badge.bleRoom];
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
 var menu = { "": { "title": "-- Select Backlight --" } };
 function bl(i) {
   return function() {
     Badge.defaultPattern=i;
     Badge.pattern(Badge.defaultPattern);
   };
 }
 menu.off=bl();
 for (var i in Badge.patterns) menu[i]=bl(i);
  menu["Back to Badge"]=Badge.badge;
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
 menu["Send Anon. Location : "+(Badge.settings.location?"Yes":"No")]=toggle("location");
 menu["Get Alerts/Info : "+(Badge.settings.allowScan?"Yes":"No")]=toggle("allowScan");
 menu[firstRun?"Continue...":"Back to Badge"]=()=>{
   require("Storage").write("settings", Badge.settings);
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
   x1: x - 5,
   x2: x + 5,
   y: 10 + Math.random() * (g.getHeight() - 20),
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
Badge.apps["Bluetooth Workshop"] = ()=>{
 function ble(fn) {
   //NRF.wake();
   Badge.drawCenter(`Now connectable!
Press any button to
exit.

Name: Pixl.js ${Badge.getName()}`,"Bluetooth");   
   function exit() {
     NRF.setServices({});
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
           onWrite : function(evt) {
             var d = new Uint8Array(evt.data);
             analogWrite(LED.VIBL,(0|d[0])/255);
             analogWrite(LED.VIBR,(0|d[1])/255);
             Terminal.println("BUZZ "+d);
           }
         }
       }
     });
   },{uart:false}),
   "Accelerometer":()=>ble(()=>{
     NRF.setServices({
       "7b340000-105b-2b38-3a74-2932f884e90e" : {
         "7b340003-105b-2b38-3a74-2932f884e90e" : {
           readable : true,
           notify : true,
           value : [0,0,0],
         }
       }
     });
     setInterval(()=>{
       var accel = NC.accel();
       try {
       NRF.updateServices({
         "7b340000-105b-2b38-3a74-2932f884e90e" : {
           "7b340003-105b-2b38-3a74-2932f884e90e" : {
             value : [accel.x*63,accel.y*63,accel.z*63],
             notify: true
           }
         }
       });
       } catch (e) {
       }
     },200);
   },{uart:false}),
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
NRF.on('connect',addr=>Terminal.println(addr+" connected"));
NRF.on('disconnect',addr=>Terminal.println("BLE disconnected"));
// --------------------------------------------
// Run at boot...
function onInit() { 
 Badge.drawCenter("Hold down BTN4 to\nenable connection.");
 // buzz after a delay to give stuff like the accelerometer a chance to init
 setTimeout(function() {
   digitalPulse(VIBL,1,100);
   digitalPulse(VIBR,0,[500,100]);
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
 },1500);
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
  if (firstLoad) Badge.apps.Privacy(true);
  else Badge.badge();
}

