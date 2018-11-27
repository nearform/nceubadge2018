// Turn your NodeConf EU 2018 Badge into a lovely Deskclock
// Left buttons up/down for LED colour. Right buttons up/down for backlight colour
// espruino --minify --board PIXLJS flashclock.js --config MODULE_AS_FUNCTION=true -o flashclock-min.js
// TODO: Final page on nodebadge.org/clock
// reset();
// require("Storage").eraseAll();

// The last time that we displayed
var lastTime = "00:00";

// If animating, this is the interval's id
var animInterval;

// Load a bigger font for seconds/time
require("Font8x12").add(Graphics);

/* Get array of lines from digit d to d+1.
 n is the amount (0..1)
 maxFive is true is this digit only counts 0..5 */
function getLines(d, n, maxFive) {
    var r = Math.PI * n / 2;
    switch (d) {
        case "0":
            return [
                [n, 0, 1, 0],
                [1, 0, 1, 1],
                [1, 1, 1, 2],
                [n, 2, 1, 2],
                [n, 1, n, 2],
                [n, 0, n, 1]
            ];
        case "1":
            return [
                [1 - n, 0, 1, 0],
                [1, 0, 1, 1],
                [1 - n, 1, 1, 1],
                [1 - n, 1, 1 - n, 2],
                [1 - n, 2, 1, 2]
            ];
        case "2":
            return [
                [0, 0, 1, 0],
                [1, 0, 1, 1],
                [0, 1, 1, 1],
                [0, 1 + n, 0, 2],
                [1, 2 - n, 1, 2],
                [0, 2, 1, 2]
            ];
        case "3":
            return [
                [0, 0, 1 - n, 0],
                [0, 0, 0, n],
                [1, 0, 1, 1],
                [0, 1, 1, 1],
                [1, 1, 1, 2],
                [n, 2, 1, 2]
            ];
        case "4":
            return [
                [0, 0, 0, 1],
                [1, 0, 1 - n, 0],
                [1, 0, 1, 1 - n],
                [0, 1, 1, 1],
                [1, 1, 1, 2],
                [1 - n, 2, 1, 2]
            ];
        case "5":
            return maxFive ? [ // 5 -> 0
                [0, 0, 0, 1],
                [0, 0, 1, 0],
                [n, 1, 1, 1],
                [1, 1, 1, 2],
                [0, 2, 1, 2],
                [0, 2, 0, 2],
                [1, 1 - n, 1, 1],
                [0, 1, 0, 1 + n]
            ] : [ // 5 -> 6
                    [0, 0, 0, 1],
                    [0, 0, 1, 0],
                    [0, 1, 1, 1],
                    [1, 1, 1, 2],
                    [0, 2, 1, 2],
                    [0, 2 - n, 0, 2]
                ];
        case "6":
            return [
                [0, 0, 0, 1 - n],
                [0, 0, 1, 0],
                [n, 1, 1, 1],
                [1, 1 - n, 1, 1],
                [1, 1, 1, 2],
                [n, 2, 1, 2],
                [0, 1 - n, 0, 2 - 2 * n]
            ];
        case "7":
            return [
                [0, 0, 0, n],
                [0, 0, 1, 0],
                [1, 0, 1, 1],
                [1 - n, 1, 1, 1],
                [1, 1, 1, 2],
                [1 - n, 2, 1, 2],
                [1 - n, 1, 1 - n, 2]
            ];
        case "8":
            return [
                [0, 0, 0, 1],
                [0, 0, 1, 0],
                [1, 0, 1, 1],
                [0, 1, 1, 1],
                [1, 1, 1, 2],
                [0, 2, 1, 2],
                [0, 1, 0, 2 - n]
            ];
        case "9":
            return [
                [0, 0, 0, 1],
                [0, 0, 1, 0],
                [1, 0, 1, 1],
                [0, 1, 1 - n, 1],
                [0, 1, 0, 1 + n],
                [1, 1, 1, 2],
                [0, 2, 1, 2]
            ];
        case ":":
            return [
                [0.4, 0.4, 0.6, 0.4],
                [0.6, 0.4, 0.6, 0.6],
                [0.6, 0.6, 0.4, 0.6],
                [0.4, 0.4, 0.4, 0.6],
                [0.4, 1.4, 0.6, 1.4],
                [0.6, 1.4, 0.6, 1.6],
                [0.6, 1.6, 0.4, 1.6],
                [0.4, 1.4, 0.4, 1.6]
            ];
    }
    return [];
}

/* Draw a transition between lastText and thisText.
 'n' is the amount - 0..1 */
function draw(lastText, thisText, n) {
    var x = 1; // x offset
    var y = 10; // y offset
    var s = 16; // character size
    g.clear();
    for (var i = 0; i < lastText.length; i++) {
        var lastCh = lastText[i];
        var thisCh = thisText[i];
        var ch, chn = n;
        if (lastCh !== undefined &&
            (thisCh - 1 == lastCh ||
                (thisCh == 0 && lastCh == 5) ||
                (thisCh == 0 && lastCh == 9)))
            ch = lastCh;
        else {
            ch = thisCh;
            chn = 0;
        }
        var l = getLines(ch, chn, lastCh == 5 && thisCh == 0);
        if (ch == ":") x -= 4;
        l.forEach(function (c) {
            if (c[0] != c[2]) // horiz
                g.fillRect(x + c[0] * s, y + c[1] * s - 1, x + c[2] * s, y + c[3] * s + 1);
            else if (c[1] != c[3]) // vert
                g.fillRect(x + c[0] * s - 1, y + c[1] * s, x + c[2] * s + 1, y + c[3] * s);
        });
        if (ch == ":") x -= 4;
        x += 22;
    }
    var d = new Date();
    g.setFont8x12();
    g.setFontAlign(-1, -1);
    g.drawString(("0" + d.getSeconds()).substr(-2), x, y + 2 * s - 8);
    // date
    g.setFontAlign(0, -1);
    g.drawString(d.toString().substr(0, 15), g.getWidth() / 2, y + 2 * s + 4);
    g.flip();
}

/* Show the current time, and animate if needed */
function showTime() {
    if (animInterval) return; // in animation - quit
    var d = new Date();
    var t = (" " + d.getHours()).substr(-2) + ":" +
        ("0" + d.getMinutes()).substr(-2);
    var l = lastTime;
    // same - don't animate
    if (t == l) {
        draw(t, l, 0);
        return;
    }
    var n = 0;
    animInterval = setInterval(function () {
        n += 1 / 16; /* 16px wide, so need 16(17) steps */
        if (n >= 1) {
            n = 1;
            clearInterval(animInterval);
            animInterval = 0;
        }
        draw(l, t, n);
    }, 50);
    lastTime = t;
}

function backlight(a) { // 12 element array
    if (!a) a = new Uint8Array(12);
    i2c.wl(7, a); i2c.wl(0x16, 0x00);
}

function ledTop(a) { // 3 element array
    if (!a) a = new Uint8Array(3);
    i2c.wl(4, a); i2c.wl(0x16, 0x00);
}

function ledBottom(a) { // 3 element array
    if (!a) a = new Uint8Array(3);
    i2c.wl(1, a); i2c.wl(0x16, 0x00);
}


var i2c = new I2C();


const backlightOptions = {
    OFF: [0, 0, 0],
    DIM: [31, 31, 31],
    BRIGHT: [80, 80, 80],
    VERYBRIGHT: [127, 127, 127],
    PINK: [50, 0, 127],
    BLUE: [127, 0, 0]
};

const ledOptions = {
    OFF: [0, 0, 0],
    DIMWHITE: [31, 31, 31],
    BRIGHTWHITE: [80, 80, 80],
    VERYBRIGHTWHITE: [127, 127, 127],
    DIMPINK: [12, 0, 31],
    BRIGHTPINK: [30, 0, 80],
    VERYBRIGHTPINK: [50, 0, 127],
    DIMBLUE: [31, 0, 0],
    BRIGHTBLUE: [80, 0, 0],
    VERYBRIGHTBLUE: [127, 0, 0]
};

const backlightSettings = [backlightOptions.OFF, backlightOptions.DIM, backlightOptions.BRIGHT, backlightOptions.VERYBRIGHT, backlightOptions.PINK, backlightOptions.BLUE];
const ledSettings = [ledOptions.OFF, ledOptions.DIMWHITE, ledOptions.BRIGHTWHITE, ledOptions.VERYBRIGHTWHITE, ledOptions.DIMPINK, ledOptions.BRIGHTPINK, ledOptions.VERYBRIGHTPINK, ledOptions.DIMBLUE, ledOptions.BRIGHTBLUE, ledOptions.VERYBRIGHTBLUE];
var backlightIndex = 1;
var ledIndex = 1;

function onInit() {

    // SN3218 LED driver
    i2c.wl = function (reg, data) { // write to LEDs
        this.writeTo(84, reg, data);
    };

    i2c.setup({ sda: A4, scl: A5 });
    D2.set(); // turn on LED
    i2c.wl(0, 1); // no shutdown
    i2c.wl(0x13, [0x3F, 0x3F, 0x3F]); // led bank 1,2,3

    // White backlight
    // 127 is very bright 
    // 31 is a good in between 
    backlight(backlightSettings[backlightIndex].concat(backlightSettings[backlightIndex], backlightSettings[backlightIndex], backlightSettings[backlightIndex]));

    // Set LEDs
    ledTop(ledSettings[ledIndex]);
    ledBottom(ledSettings[ledIndex]);

    setWatch(function () {
        // TOP LEFT
        // NEXT
        ledIndex = (ledIndex + 1) % ledSettings.length;
        // Set LEDs
        ledTop(ledSettings[ledIndex]);
        ledBottom(ledSettings[ledIndex]);
    }, BTN1, { edge: "rising", debounce: 50, repeat: true });

    setWatch(function () {
        // TOP RIGHT
        // NEXT
        backlightIndex = (backlightIndex + 1) % backlightSettings.length;
        // Set Backlight
        backlight(backlightSettings[backlightIndex].concat(backlightSettings[backlightIndex], backlightSettings[backlightIndex], backlightSettings[backlightIndex]));
    }, BTN2, { edge: "rising", debounce: 50, repeat: true });

    setWatch(function () {
        // BOTTOM RIGHT
        //PREV
        backlightIndex = (backlightIndex == 0) && backlightSettings.length - 1 || backlightIndex - 1
        // Set backlight
        backlight(backlightSettings[backlightIndex].concat(backlightSettings[backlightIndex], backlightSettings[backlightIndex], backlightSettings[backlightIndex]));
    }, BTN3, { edge: "rising", debounce: 50, repeat: true });

    setWatch(function () {
        // BOTTOM LEFT
        //PREV
        ledIndex = (ledIndex == 0) && ledSettings.length - 1 || ledIndex - 1
        // Set LEDs
        ledTop(ledSettings[ledIndex]);
        ledBottom(ledSettings[ledIndex]);
    }, BTN4, { edge: "rising", debounce: 50, repeat: true });

    // Update time once a second
    setInterval(showTime, 1000);

}
