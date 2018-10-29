// Clap detection?

/* Broken
function click() {
   // Turn on single and double clicks for Z, Y and X axis
  i2c.wa(0x38, 0x30); // click_cfg - double+single, z axis
  i2c.ra(0x39)[0].toString(2); // click_src
  // Set click/double click configuration values
  i2c.wa(0x3A, 0x10); // CLICK_THS
  i2c.wa(0x3B, 0xFF); // TIME_LIMIT
  i2c.wa(0x3C, 0xFF); // double click latency
  i2c.wa(0x3D, 0xFF); // double click time window
  i2c.wa(0x3E, 0xFF); // wakeup threshold
  i2c.wa(0x3F, 0xFF); // wake duration
  i2c.wa(0x22, 0x40); // Click int on INT1
  clearWatch();
  setWatch(x=>{print(x.state);LED.write(x.state)},D3,{repeat:true,edge:"both"});
}*/

/*
// kinda works. click would be better
function accel() {
  var i2c = NC.i2c;
  i2c.wa(0x20,0x9F); // 800Hz
  i2c.wa(0x30,0x20); // OR Z min/Z max
  i2c.ra(0x31)[0].toString(2); // read int state
  i2c.wa(0x32,0x2); // 7 bit threshhold
  i2c.wa(0x33,0x7); // 7 bit duration
  i2c.wa(0x22,0x20); // AOI1 int on INT1
  clearWatch();
  setWatch(x=>{print(x.state);LED.write(x.state)},D3,{repeat:true,edge:"both"});
}*/
