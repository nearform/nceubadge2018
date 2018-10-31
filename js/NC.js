require("Storage").write("NC",`
global.LED2 = D4; // broken
global.VIBL = D7;
global.VIBR = D8;
global.J1 = [ A0,A1,A2,A3];
global.J2 = [ D10,D11,D12,D13 ];
const ACC_INT = D3, LED_PWR = D2; // 1=on
var i2c = new I2C();
// SN3218 LED driver
i2c.wl = function(reg,data) { // write to LEDs
  this.writeTo(84,reg,data);
};
// LSM303D accel/mag
i2c.ra = function(reg,count) {
  this.writeTo(30,reg);
  return this.readFrom(30,count||1);
};
i2c.wa = function(reg,data) {
  this.writeTo(30,reg,data);
};

//https://www.st.com/resource/en/datasheet/lsm303d.pdf
function init() {
  i2c.setup({sda:A4,scl:A5});
  // SN3218
  LED_PWR.set(); // LED on
  i2c.wl(0,1); // no shutdown
  i2c.wl(0x13,[0x3F,0x3F,0x3F]); // led bank 1,2,3
  // LSM303
  if (i2c.ra(15,1)[0]!=73) console.log("LSM303D WHOIS failed");
  //i2c.wa(0x1f,0x80) // ctrl0-reset memory
  i2c.wa(0x20,0x5F); //ctrl1 - 50Hz, all 3 axes, block data update
  i2c.wa(0x21,0); //ctrl2 - +-2g, no filtering
  i2c.wa(0x22,0); //ctrl3 -  int1 src
  i2c.wa(0x23,0); //ctrl4 - int2 src 
  i2c.wa(0x24,0x10); //ctrl5 - 50Hz magnetometer
  i2c.wa(0x25,0); //ctrl6 - +-2 gauss magnetometer
  i2c.wa(0x26,0); //ctrl7 - no filter, continuous conversion
}
E.on('init',init);
init();

exports = {
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
    LED2.reset();
    analogRead(LED2);  
    var n = 0;
    for (var i=0;i<10;i++)n+=analogRead(LED2);
    return Math.min(n*0.3,1);
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
};`);
