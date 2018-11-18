function getLines(b,a,c){var d=Math.PI*a/2;switch(b){case'0':return[[a,0,1,0],[1,0,1,1],[1,1,1,2],[a,2,1,2],[a,1,a,2],[a,0,a,1]];case'1':return[[1-a,0,1,0],[1,0,1,1],[1-a,1,1,1],[1-a,1,1-a,2],[1-a,2,1,2]];case'2':return[[0,0,1,0],[1,0,1,1],[0,1,1,1],[0,1+a,0,2],[1,2-a,1,2],[0,2,1,2]];case'3':return[[0,0,1-a,0],[0,0,0,a],[1,0,1,1],[0,1,1,1],[1,1,1,2],[a,2,1,2]];case'4':return[[0,0,0,1],[1,0,1-a,0],[1,0,1,1-a],[0,1,1,1],[1,1,1,2],[1-a,2,1,2]];case'5':return c?[[0,0,0,1],[0,0,1,0],[a,1,1,1],[1,1,1,2],[0,2,1,2],[0,2,0,2],[1,1-a,1,1],[0,1,0,1+a]]:[[0,0,0,1],[0,0,1,0],[0,1,1,1],[1,1,1,2],[0,2,1,2],[0,2-a,0,2]];case'6':return[[0,0,0,1-a],[0,0,1,0],[a,1,1,1],[1,1-a,1,1],[1,1,1,2],[a,2,1,2],[0,1-a,0,2-2*a]];case'7':return[[0,0,0,a],[0,0,1,0],[1,0,1,1],[1-a,1,1,1],[1,1,1,2],[1-a,2,1,2],[1-a,1,1-a,2]];case'8':return[[0,0,0,1],[0,0,1,0],[1,0,1,1],[0,1,1,1],[1,1,1,2],[0,2,1,2],[0,1,0,2-a]];case'9':return[[0,0,0,1],[0,0,1,0],[1,0,1,1],[0,1,1-a,1],[0,1,0,1+a],[1,1,1,2],[0,2,1,2]];case':':return[[0.4,0.4,0.6,0.4],[0.6,0.4,0.6,0.6],[0.6,0.6,0.4,0.6],[0.4,0.4,0.4,0.6],[0.4,1.4,0.6,1.4],[0.6,1.4,0.6,1.6],[0.6,1.6,0.4,1.6],[0.4,1.4,0.4,1.6]];}return[];}function draw(k,n,m){var b=1;var c=10;var a=16;g.clear();for(var f=0;f<k.length;f++){var d=k[f];var e=n[f];var h,j=m;d!==undefined&&(e-1==d||e==0&&d==5||e==0&&d==9)?h=d:(h=e,j=0);var l=getLines(h,j,d==5&&e==0);h==':'&&(b-=4),l.forEach(function(d){d[0]!=d[2]?g.fillRect(b+d[0]*a,c+d[1]*a-1,b+d[2]*a,c+d[3]*a+1):d[1]!=d[3]&&g.fillRect(b+d[0]*a-1,c+d[1]*a,b+d[2]*a+1,c+d[3]*a);}),h==':'&&(b-=4),b+=22;}var i=new Date();g.setFont8x12(),g.setFontAlign(-1,-1),g.drawString(('0'+i.getSeconds()).substr(-2),b,c+2*a-8),g.setFontAlign(0,-1),g.drawString(i.toString().substr(0,15),g.getWidth()/2,c+2*a+4),g.flip();}function showTime(){if(animInterval)return;var d=new Date();var a=(' '+d.getHours()).substr(-2)+':'+('0'+d.getMinutes()).substr(-2);var c=lastTime;if(a==c){draw(a,c,0);return;}var b=0;animInterval=setInterval(function(){b+=0.0625,b>=1&&(b=1,clearInterval(animInterval),animInterval=0),draw(c,a,b);},50),lastTime=a;}function onInit(){setInterval(showTime,1000);}Modules.addCached('Font8x12',function(){var a=atob('AAAAAAAAAAfkAAwAAAwAAACQf8CQf8CQAAGIJEf+JEE4AAMMMQBgCMMMAAAYMkTEMkAYBkAAwAgAAAHwIIQEAAQEIIHwAABAFQDgBADgFQBABABAHwBABAAAACAMAABABABABABAAAAEAAAEAYAgDAEAYAAAP4QkRESEP4AAEEIEf8AEAAMMQUQUQkPEAAIIQEREREO4AABwCQEQIQf8AAeISESESER4AAH4KESESEB4AAYAQAQcTgcAAAO4REREREO4AAPAQkQkQoPwAACIAAACCMAABACgEQIIAACQCQCQCQCQAAIIEQCgBAAAMAQAQ0RAOAAAP4QETkUUUUP0AAP8RARARAP8AAf8REREREO4AAP4QEQEQEIIAAf8QEQEIIHwAAf8REREREQEAAf8RARARAQAAAP4QEQEREJ4AAf8BABABAf8AAQEf8QEAAAYAEQEf4QAAAf8BACgEQYMAAf8AEAEAEAEAAf8IAEACAEAIAf8AAf8EACABAf8AAP4QEQEQEP4AAf8RARARAOAAAP4QEQEQGP6AAf8RgRQRIOEAAOIREREREI4AAQAQAf8QAQAAAf4AEAEAEf4AAeABwAMBweAAAf8AIAQAgAQAIf8AAYMGwBAGwYMAAYAGAB8GAYAAAQMQ0REWEYEAAf8QEAAMACABgAQAMAAQEf8AAIAQAgAQAIAAAACACACACACAAgAwAAAAYCkCkCkB8AAf8CECECEB4AAB4CECECEBIAAB4CECECEf8AAB4CUCUCUBwAACAP8SAQAAAB4CFCFCFD+AAf8CACACAB8AACET8AEAAACABT+AAf8AgBQCIAEAAQEf8AEAAD8CACAD8CACAB8AAD8CACACAB8AAB4CECECEB4AAD/CECECEB4AAB4CECECED/AAD8BACACACAAABICkCkCkAYAACAP4CECEAAD4AEAEAED8AADAAwAMAwDAAAD4AEAEA4AEAED4AACMBQAgBQCMAAD4AFAFAFD+AACMCUCkDECEAABAO4QEQEAAf8AAQEQEO4BAAAYAgAQAQAIAwAAAAAAAAAAAAA'),b=atob('BQIEBgYGBwMEBAcGAwYCBwYFBgYGBgYGBgYCAwUGBQYHBgYGBgYGBgYEBgYGCAYGBgYGBgYGBggGBgYDBgMGBgMGBgYGBgUGBgQEBgQIBgYGBgYGBQYGCAYGBgUCBQcF');exports.add=function(c){c.prototype.setFont8x12=function(){this.setFontCustom(a,32,b,12);};};});var lastTime='00:00';var animInterval;require('Font8x12').add(Graphics);