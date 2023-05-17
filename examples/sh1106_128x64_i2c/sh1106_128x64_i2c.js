/**************************************************************************
 This is an example Monochrome OLEDs based on SH1106 driver adapted from 
 SSD1306 Adafruit Driver.

 SSD1306 examples Written by Limor Fried/Ladyada for Adafruit Industries,
 with contributions from the open source community.

 Adopted to NodeJS by Lyndel R. McGee

 BSD license, check license.txt for more information
 All text above, and the splash screen below must be
 included in any redistribution.
 **************************************************************************/
'use strict';
const Adafruit_GFX_Library = require("@lynniemagoo/adafruit-gfx-library");
const delay = Adafruit_GFX_Library.Utils.sleepMs;

const BASE_PATH = "../../";
const {Adafruit_SH1106} = require(BASE_PATH + "index");


const {
    testDrawLine,
    testDrawRect,
    testFillRect,
    testDrawCircle,
    testFillCircle,
    testDrawRoundRect,
    testFillRoundRect,
    testDrawTriangle,
    testFillTriangle,
    testDrawChar,
    testDrawStyles,
    testDrawBitmap,
    testAnimate,
    LOGO_BMP,
    LOGO_HEIGHT,
    LOGO_WIDTH
} = require("../common/sh1106_common");


const Adafruit_SPITFT = Adafruit_GFX_Library.Display.Adafruit_SPITFT;
const {Mixin_I2C_Display, I2C_DEFAULTS} = Adafruit_GFX_Library.Mixins;


// Use mixin to bind SPI implementation to SH1106 class.
class Adafruit_SH1106_I2C extends Mixin_I2C_Display(Adafruit_SH1106) {}


async function main() {
    const displayOptions = {
        width:128,
        height:64,
        rotation:0,
        /*noSplash:true,*/
        rstGpioNb:-1,
        i2cBusNumber:0x01,
        i2cAddress:0x3C
    }

    const display = new Adafruit_SH1106_I2C(displayOptions);
    // Startup display - same as original adafruit begin() but options specified in the constructor.
    await display.startup();
    await delay(3000);

    let count = 4, rotation = 0;

    while (count--) {
        await display.setRotation(rotation);

        await testDrawLine(display);

        await testDrawRect(display);
        await testFillRect(display);

        await testDrawCircle(display);
        await testFillCircle(display);

        await testDrawRoundRect(display);
        await testFillRoundRect(display);

        await testDrawTriangle(display);
        await testFillTriangle(display);

        await testDrawChar(display);
        await testDrawStyles(display);
        await testDrawBitmap(display);
        
        // Invert and restore display, pausing in-between
        await display.invertDisplay(true);
        await delay(1000);
        await display.invertDisplay(false);
        await delay(3000);

        // Do 10 seconds of animation.
        await testAnimate(display, LOGO_BMP, LOGO_WIDTH, LOGO_HEIGHT, 10000);
        rotation +=1;
    }
    await delay(3000);
    await display.setRotation(0);
    await display.shutdown();
}
main();