// Slowly pulsing yellow/red pattern
Badge.patterns.yellow=()=>{ var n=0;return [()=>{
  n+=20;
  if (n>1536)n=0;
  NC.ledTop([0,64+Math.max(127-Math.abs(n-1024),0),127]);
  NC.ledBottom([0,64+Math.max(127-Math.abs(n-1384),0),127]);
  NC.backlight([0,64+Math.max(127-Math.abs(n-640),0),127,
                0,64+Math.max(127-Math.abs(n-512),0),127,
                0,64+Math.max(127-Math.abs(n-384),0),127,
                0,64+Math.max(127-Math.abs(n-256),0),127]);
},75];};
