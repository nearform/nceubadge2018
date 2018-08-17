global.LED2 = D4; // broken
global.VIBL = D7;
global.VIBR = D8;
global.J1 = [ A0,A1,A2,A3];
global.J2 = [ D10,D11,D12,D13 ];
var i2c = new I2C();
i2c.setup({sda:A4,scl:A5});
ACC_INT = D3;
LED_PWR = D2; // 1=on

// SN3218 LED driver
i2c.wl = function(reg,data) { // write to LEDs
  this.writeTo(84,reg,data);
};
LED_PWR.set(); // LED on
i2c.wl(0,1); // no shutdown
i2c.wl(0x13,[0x3F,0x3F,0x3F]); // led bank 1,2,3
// LSM303D accel/mag
i2c.ra = function(reg,count) {
  this.writeTo(30,reg);
  return this.readFrom(30,count||1);
};
i2c.wa = function(reg,data) {
  this.writeTo(30,reg,data);
};
if (i2c.ra(15,1)[0]!=73) console.log("LSM303D WHOIS failed");
i2c.wa(0x21,0); //ctrl2
i2c.wa(0x20,0x57); //ctrl1
i2c.wa(0x24,0x64); //ctrl5
i2c.wa(0x25,0x20); //ctrl6
i2c.wa(0x26,0x00); //ctrl7

var NC = {
  i2c : i2c,
  ESP8266 : { tx:D0, rx:D1, pd:D9 },
  getBatteryState : function() {
    var LIPO = { CHRG : D5, STBY : D6 }; // tp4056
    pinMode(LIPO.CHRG, "input_pullup");
    pinMode(LIPO.STBY, "input_pullup");
    var s = {
      charging:!LIPO.CHRG.read(),
      standby:!LIPO.STBY.read()
    };
    pinMode(LIPO.CHRG, "input");
    pinMode(LIPO.STBY, "input");
    return s;
  },
  light : function() {
    analogRead(LED2);
    return Math.min(analogRead(LED2)*5,1);
  },  
  accel : function() {
    var d = i2c.ra(0x28|0x80,6);
    return {
      x:((d[0]|(d[1]<<8))-(d[1]&128)*512)/16384,
      y:((d[2]|(d[3]<<8))-(d[3]&128)*512)/16384,
      z:((d[4]|(d[5]<<8))-(d[5]&128)*512)/16384
    };
  },
  mag : function() {
    var d = i2c.ra(0x88|0x80,6);
    return {
      x:(d[0]|(d[1]<<8))-(d[1]&128)*512,
      y:(d[2]|(d[3]<<8))-(d[3]&128)*512,
      z:(d[4]|(d[5]<<8))-(d[5]&128)*512
    };
  },
  backlight : function(a) { // 12 element array
    if (!a) a = new Uint8Array(12);
    i2c.wl(7,a);i2c.wl(0x16,0x00); 
  },
  ledTop : function(a) { // 3 element array
    if (!a) a = new Uint8Array(3);
    i2c.wl(4,a);i2c.wl(0x16,0x00); 
  },
  ledBottom: function(a) { // 3 element array
    if (!a) a = new Uint8Array(3);
    i2c.wl(1,a);i2c.wl(0x16,0x00); 
  }
};

var n = 0,s = 0.01, c = 0.1;
setInterval(function() {
  n += s;
  var d = new Uint8Array(12);
  d.set(E.HSBtoRGB(n,1,1,1),0);
  d.set(E.HSBtoRGB(n+c,1,1,1),3);
  d.set(E.HSBtoRGB(n+(c*2),1,1,1),6);
  d.set(E.HSBtoRGB(n+(c*3),1,1,1),9);
  NC.backlight(d);
  NC.ledTop(E.HSBtoRGB(n+(c*4),1,1,1),9);
  NC.ledBottom(E.HSBtoRGB(n+(c*5),1,1,1),9);
}, 20);

/*function int() {
  analogWrite(VIBL, (Math.sin(getTime())+1)/2, {freq:1000});
}
setInterval(int,20);*/

setInterval(function() {
  g.clear();
  g.drawString(E.toJS(NC.getBatteryState()));
  g.flip();
}, 1000);


/*
var WIFI_NAME = "...";
var WIFI_PASS = "...";
D9.set(); // power on
Serial1.setup(115200,{rx:D0,tx:D1});
var wifi = require("ESP8266WiFi_0v25").connect(Serial1, function(err) {
  if (err) throw err;
  console.log("Connecting to WiFi");
  wifi.connect(WIFI_NAME, WIFI_PASS, function(err) {
    if (err) throw err;
    console.log("Connected");
    // Now you can do something, like an HTTP request
    require("http").get("http://www.pur3.co.uk/hello.txt", function(res) {
      console.log("Response: ",res);
      res.on('data', function(d) {
        console.log("--->"+d);
      });
    });
  });
});*/