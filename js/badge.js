var NC = require("NC");

Badge = global.Badge||{};
Badge.URL = "http://www.espruino.com";
// User-defined apps
Badge.apps = Badge.apps||{};
Badge.patterns = Badge.patterns||{};
Badge.badgeImages = Badge.badgeImages||[];
Badge.badgeImages.push({ width: 128, height: 64, bpp: 1,
 buffer: E.toArrayBuffer(atob("AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAcAAAAAAAAAAAAAAAAAAAP/gAAAAAAAAAAAAAAAAAP/+0AAAAAAAAAAAAAAAAAP+AHgAAAAAAAAAAAAAAAADQAAsAAAAAAAAAAAAAAAAAyAAFgAAAAAAAAAAAAAAAAOgAAvwAAAAAAAAAAAAAAABUD+F2AAAAAAAAAAAAAAAAS/D/4gAAAAAAAAAAAAAAAEv//nIAAAAAAAAAAAAAAABE/4BaAAAAAAAAAAAAAAAAQ8AAWh/wAAAAAGAAAAAAAEAAAFof8AAAAABgAAAAAABAAAByHAAAAAAAAAAAAAAAQAAAZhwB4bhtjmZweAAAAEAAAGwcA/H8fY5n+PwAAABAAABwH+MZznGOZznOAAAAQAAAYB/jgYZhjmcZhgAAAeAAAGAcAfGGYY5nGYYAAAHgAABgHAB5hmGOZxmGAAAB8AAAcBwCGc5hjmcZzgAAAPgAAHAf8/n8Yf5nGPwAAAB4AANwH/HxuGD2Zxh4AAAAfAH/wAAAAYAAAAAAAAAAADx//oAAAAGAAAAAAAAAAAAWf7eAAAABgAAAAAAAAAAAH+38AAAAAAAAAAAAAAAAAAB/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=="))});

// Get it all back to normal-ish
Badge.reset = () => {
 Pixl.menu();
 if (Badge._pattern) clearInterval(Badge._pattern);
 delete Badge._pattern;
 clearInterval();
 clearWatch();
 Bluetooth.removeAllListeners();
 LoopbackB.removeAllListeners();
 g.clear();
 g.flip();
 if (Badge.defaultPattern) Badge.pattern(Badge.defaultPattern);
};
Badge.drawCenter = s => {
  g.clear();
  s.split("\n").forEach((s, i) => g.drawString(s, (128-g.stringWidth(s))/2, i*6));
  g.flip();
};
// LED patterns
Badge.patterns.red=()=>{ var n=0;return ()=>{
  n+=50;
  if (n>1536)n=0;
  NC.ledTop([0,0,Math.max(255-Math.abs(n-1024),0)]);
  NC.ledBottom([0,0,Math.max(255-Math.abs(n-1384),0)]);
  NC.backlight([0,0,Math.max(255-Math.abs(n-640),0),
                0,0,Math.max(255-Math.abs(n-512),0),
                0,0,Math.max(255-Math.abs(n-384),0),
                0,0,Math.max(255-Math.abs(n-256),0)]);
};};
Badge.patterns.rainbow=()=>{ var n=0;return ()=>{
  n += 0.01;
  var d = new Uint8Array(12);
  d.set(E.HSBtoRGB(n,1,1,1),0);
  d.set(E.HSBtoRGB(n+0.1,1,1,1),3);
  d.set(E.HSBtoRGB(n+0.2,1,1,1),6);
  d.set(E.HSBtoRGB(n+0.3,1,1,1),9);
  NC.backlight(d);
  NC.ledTop(E.HSBtoRGB(n+0.4,1,1,1),9);
  NC.ledBottom(E.HSBtoRGB(n+0.5,1,1,1),9);
};};
Badge.patterns.disco=()=>{ var n=0;return ()=> {
  n += 0.01;
  var d = new Uint8ClampedArray(18);
  E.mapInPlace(d,d,x=>Math.random()*2048 - 1792);
  NC.ledBottom(d); // hack to send to *all* LEDs
};};
Badge.pattern = function(name) {
  NC.ledTop();
  NC.ledBottom();
  NC.backlight();
  if (Badge._pattern) clearInterval(Badge._pattern);
  delete Badge._pattern;
  if (Badge.patterns[name]) 
    Badge._pattern = setInterval(Badge.patterns[name](),50);
};
// Main menu
Badge.menu = () => {
 function wait(cb) { m = { move: cb, select: cb }; }
 var mainmenu = {
  "": { "title": "-- Your badge --" },
  "About": function () {
   Badge.drawCenter(`-- Nodeconf 2018 --

with @Espruino
www.espruino.com
`);
   wait(e => Badge.menu());
  },
  "Make Connectable": () => {
   Badge.drawCenter(`-- Now Connectable --

You can connect to this badge
with a BLE capable device. Go to
espruino.com/ide on a Web BLE
capable browser to start coding!`);
   g.drawString("Name: Pixl.js " + NRF.getAddress().substr(-5).replace(":", ""), 0, 44);
   g.drawString("MAC: " + NRF.getAddress(), 0, 50);
   g.flip();
   wait(() => { NRF.sleep(); Badge.menu(); });
   NRF.wake();
  },
  "Backlight": Badge.selectBacklight,
  "T-Rex": Badge.trex,
  "Flappy Bird": Badge.flappy,
  "Back to Badge": Badge.badge
 };
 for (var i in Badge.apps) mainmenu[i]=Badge.apps[i];
 Badge.reset();
 Pixl.menu(mainmenu);
};
Badge.selectBacklight = ()=>{
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
Badge.badge = ()=>{
 Badge.reset(); 
 var counter = 0;
 var timeout;
 function draw(n) {
  counter += n ? n : 0;
  if (counter < 0) counter = Badge.badgeImages.length - 1;
  if (counter >= Badge.badgeImages.length) counter = 0;
  g.clear();
  g.drawImage(Badge.badgeImages[counter]);
  g.flip();
  var delay = (counter==0) ? 20000 : 2500;
  if (timeout) clearTimeout(timeout);  
  timeout = setTimeout(e => { timeout = undefined; draw(1); }, delay);
 }
 draw(0);
 setWatch(Badge.menu, BTN1, { repeat: 1, debounce: 50, edge: "rising" });
 setWatch(e => Bdraw(-1), BTN2, { repeat: 1, debounce: 50, edge: "rising" });
 setWatch(e => Bdraw(1), BTN3, { repeat: 1, debounce: 50, edge: "rising" });
};
Badge.trex = () => {
 Badge.reset();
 var IMG = {
  rex: [
   { width: 20, height: 22, bpp: 1, transparent: 0, buffer: E.toArrayBuffer(atob("AB/gA/8AN/AD/wA/8AP/AD4AA/yAfAgfwMP/Dn/Q//wP/8B/+AP/gB/wAP4AB2AAYgAAIAADAP//")) },
   { width: 20, height: 22, bpp: 1, transparent: 0, buffer: E.toArrayBuffer(atob("AB/gA/8AN/AD/wA/8AP/AD4AA/yAfAgfwMP/Dn/Q//wP/8B/+AP/gB/wAP4AB2AAYwAEAABgAP//")) },
   { width: 20, height: 22, bpp: 1, transparent: 0, buffer: E.toArrayBuffer(atob("AB/gAj8AK/ACPwA/8AP/AD4AA/yAfAgfwMP/Dn/Q//wP/8B/+AP/gB/wAP4AB2AAYgAEIABjAP//")) }
  ],
  cacti: [
   { width: 12, height: 24, bpp: 1, transparent: 0, buffer: E.toArrayBuffer(atob("BgDwDwDwDwDyT373737373737373/+f8DwDwDwDwDwDwDwDw")) },
   { width: 8, height: 18, bpp: 1, transparent: 0, buffer: E.toArrayBuffer(atob("GBhY2dnZ2fl5Hx4YGBgYGBgY")) }
  ],
 };
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
  rex.alive = false;
  rex.img = 2; // dead
  clearInterval();
  setTimeout(() => setWatch(gameStart, BTN3, { repeat: 0, debounce: 50, edge: "rising" }), 1000);
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
   if (BTN2.read() && rex.y == 0) rex.vy = 4;
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
 setWatch(Badge.menu, BTN1, { repeat: 0, debounce: 50, edge: "rising" });
};
Badge.flappy = () => {
 Badge.reset();
 var SPEED = 0.5;
 var BIRDIMG = {
  width: 8, height: 8, bpp: 1,
  transparent: 0,
  buffer: new Uint8Array([
0b00000000,
0b01111000,
0b10000100,
0b10111010,
0b10100100,
0b10000100,
0b01111000,
0b00000000,
  ]).buffer
 };

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
  setTimeout(() => setWatch(gameStart, BTNA, { repeat: 0, debounce: 50, edge: "rising" }), 1000);
  setTimeout(onFrame, 10);
 }

 function onFrame() {
  var buttonState = BTN2.read();

  g.clear();
  if (!running) {
   g.drawString("Game Over!", 25, 10);
   g.drawString("Score", 10, 20);
   g.drawString(score, 10, 26);
   g.flip();
   return;
  }

  if (buttonState && !wasPressed)
   birdvy -= 2;
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
 setWatch(Badge.menu, BTN1, { repeat: 0, debounce: 50, edge: "rising" });
};

function onInit() {
 Badge.drawCenter("Hold down BTN4 to\nenable connection.");
 setTimeout(x=>{ 
   if (!BTN4.read()) {
     NRF.nfcURL(Badge.URL);
     Badge.badge();
     //NRF.sleep();
   } else reset();   
 },1000);
}





