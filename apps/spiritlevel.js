// Simple text-only Spirit level - tells you the angle the badge is at
Badge.apps["Spirit Level"] = ()=>{
  Badge.reset();
  BTNS.forEach(p=>setWatch(Badge.badge,p));
  setInterval(_=>{
    var a = NC.accel();
    var ang = Math.atan2(a.x,a.y)*180/Math.PI;
    g.clear();
    g.setFontVector(20);
    g.setFontAlign(0,0);
    g.drawString(ang.toFixed(1),64,32);
    g.setFontBitmap();
    g.flip();
  },200);
};
