/*!
 * @file Adafruit_SH1106.js
 *
 * @mainpage NodeJS Port of Arduino library for monochrome OLEDs based on SH1106 drivers.
 *
 * @section intro_sec Introduction
 *
 * This is documentation for Adafruit's SH1106 library for monochrome
 * OLED displays: http://www.adafruit.com/category/63_98
 *
 * These displays use I2C or SPI to communicate. I2C requires 2 pins
 * (SCL+SDA) and optionally a RESET pin. SPI requires 4 pins (MOSI, SCK,
 * select, data/command) and optionally a reset pin. Hardware SPI or
 * 'bitbang' software SPI are both supported.
 *
 * Adafruit invests time and resources providing this open source code,
 * please support Adafruit and open-source hardware by purchasing
 * products from Adafruit!
 *
 * @section dependencies Dependencies
 *
 * This library depends on <a
 * href="https://github.com/adafruit/Adafruit-GFX-Library"> Adafruit_GFX</a>
 * being present on your system. Please make sure you have installed the latest
 * version before using this library.
 *
 * @section author Author
 *
 * Written by Limor Fried/Ladyada for Adafruit Industries, with
 * contributions from the open source community.
 *
 * Ported to NodeJs by Lyndel R. McGee.
 *
 * @section license License
 *
 * BSD license, all text above, and the splash screen included below,
 * must be included in any redistribution.
 *
 */

'use strict';
const Adafruit_GFX_Library = require("@lynniemagoo/adafruit-gfx-library");
const Adafruit_GrayOLED = Adafruit_GFX_Library.Display.Adafruit_GrayOLED;
const {sleepMs, extractOption} = Adafruit_GFX_Library.Utils;
const delay = sleepMs;

const splash1 = {width:0,height:0,data:null};
const splash2 = {width:0,height:0,data:null};
try {
    const splash = require("./splash1");
    splash1.width = splash.splash1_width;
    splash1.height = splash.splash1_height;
    splash1.data = splash.splash1_data;
}catch(ignore) {
}
try {
    const splash = require("./splash2");
    splash2.width = splash.splash2_width;
    splash2.height = splash.splash2_height;
    splash2.data = splash.splash2_data;
}catch(ignore) {
}


const toInt = Math.trunc,
      fMin = Math.min,
      fMax = Math.max;


//==========================================================================================================================================
//==========================================================================================================================================
// SH1106 Display Instructions from Datasheet.
//==========================================================================================================================================

const SH1106_SET_CONTRAST                         = 0x81; // 0x80 [reset]

const SH1106_DISPLAY_ALL_ON_RESUME                = 0xA4;
const SH1106_DISPLAY_ALL_ON_IGNORE                = 0xA5;

const SH1106_NORMAL_DISPLAY                       = 0xA6;
const SH1106_INVERT_DISPLAY                       = 0xA7;

const SH1106_SET_MULTIPLEX                        = 0xA8;

const SH1106_DISPLAY_OFF                          = 0xAE;
const SH1106_DISPLAY_ON                           = 0xAF;

const SH1106_SEG_REMAP_NORMAL                     = 0xA0; // Used in conjunction with COM_SCAN_INC to rotate display such that Top of display is same side as the connection strip.
const SH1106_SEG_REMAP_FLIP                       = 0xA1; // Used in conjunction with COM_SCAN_DEC to rotate display such that Top of display is opposite side of the connection strip.

const SH1106_COM_SCAN_INC                         = 0xC0; // Normal Y axis.  (Top of display is same side as connection strip)
const SH1106_COM_SCAN_DEC                         = 0xC8; // Inverted Y axis (Top of display is opposite side of connection strip.

const SH1106_SET_DISPLAY_OFFSET                   = 0xD3; // sets the offset of the row data (wraps)

const SH1106_SET_DISPLAY_CLOCK_DIV                = 0xD5;

const SH1106_SET_PRECHARGE                        = 0xD9; // 0x22 [reset]

const SH1106_SET_COM_PINS                         = 0xDA;
const SH1106_SET_VCOM_DETECT                      = 0xDB; // 0x35 [reset]

const SH1106_LOWER_COLUMN_ADDR                    = 0x00; // Values 0x00 to 0x0F are allowed.  This is used to set the low order nibble of the column address 0-131
const SH1106_HIGHER_COLUMN_ADDR                   = 0x10; // Values 0x10 to 0x1F are allowed.  This is used to set the high order nibble of the column address 0-131
const SH1106_PAGE_ADDR                            = 0xB0; // Values 0xB0 to 0xB7 are allowed.  This is used to set the page address between 0-7.

// Unused - not currently set so use the default.
const SH1106_PUMP_VOLTAGE_0                      = 0x30; // Set Pump Output Voltage to 6.4 volts
const SH1106_PUMP_VOLTAGE_1                      = 0x31; // Set Pump Output Voltage to 7.4 volts
const SH1106_PUMP_VOLTAGE_2                      = 0x32; // Set Pump Output Voltage to 8.0 volts [reset]
const SH1106_PUMP_VOLTAGE_3                      = 0x33; // Set Pump Output Voltage to 9.0 volts

const SH1106_SET_START_LINE                       = 0x40  // Set Display Start Line 0x40 - 0x7F (0-63)

// Used - Replaced PRECHARGE - Also see PUMP_VOLTAGE above.
const SH1106_DC_DC_OFF                            = 0x8A; // Panel must be off when issuing this command
const SH1106_DC_DC_ON                             = 0x8B; // Panel must be off when issuing this command
const SH1106_DC_DC_CONTROL_MODE_SET               = 0xAD; // Panel must be off when issuing this command

// Unused
const SH1106_READ_MODIFY_WRITE_START              = 0xE0; // See Datasheet - Not used by this module.
const SH1106_NOP                                  = 0xE3; // Non-Operation Command
const SH1106_READ_MODIFY_WRITE_END                = 0xEE; // See Datasheet - Not used by this module.

//==========================================================================================================================================
//==========================================================================================================================================
const SH1106_INIT_SEQ_1 = [
    SH1106_DISPLAY_OFF,
    SH1106_SET_DISPLAY_CLOCK_DIV,  0x80
];

const SH1106_INIT_SEQ_2 = [
    SH1106_SEG_REMAP_FLIP,
    SH1106_COM_SCAN_DEC
];

const SH1106_INIT_SEQ_3 = [
    SH1106_SET_VCOM_DETECT, 0x35,
    SH1106_DISPLAY_ALL_ON_RESUME,
    SH1106_NORMAL_DISPLAY
];


const SH1106_BLACK = 0;
const SH1106_WHITE = 1;
const SH1106_INVERSE = 2;

const BLACK = SH1106_BLACK;
const WHITE = SH1106_WHITE;
const INVERSE = SH1106_INVERSE;

// Used for VLine functions below.
const SH1106_VLINE_PRE_MASK = [0x00, 0x80, 0xC0, 0xE0, 0xF0, 0xF8, 0xFC, 0xFE];
const SH1106_VLINE_POST_MASK = [0x00, 0x01, 0x03, 0x07, 0x0F, 0x1F, 0x3F, 0x7F];


class Adafruit_SH1106 extends Adafruit_GrayOLED {
    /**************************************************************************/
    /*!
        @brief  Constructor for SH1106 OLED displays.
                a series of LCD commands stored in PROGMEM byte array.
        @param  options  Object specifying options to use for the display

    */
    /**************************************************************************/
    constructor(options) {

        const optionsShallow = Object.assign({}, options);
        // set bpp prior to invoking super().
        optionsShallow["bpp"] = 1;
        super(optionsShallow);
        const self = this;

        // Extract option and ensure if not specified, we specify value false to force splash screen.
        self._noSplash = !!extractOption(options, "noSplash", false);

        // Initialize with default value for the 128x32 display with 0x8F.
        self._contrast = 0x8F;
        
        // Used for testing overrides if needed.
        self._displayOffset = extractOption(options, "displayOffset", 0);
        self._startLine = extractOption(options, "startLine", 0);
        // SH1106 supports 132x64 but display only is 128x32/64 so must use a column offset of 2.
        self.page_offset = extractOption(options, "pageOffset", 0);
        self.column_offset = extractOption(options, "colOffset", 2);

        self._buffer = new Uint8Array(self.WIDTH * toInt((self.HEIGHT + 7) / 8));
    }


    //===============================================================
    // <BEGIN> NON - Adafruit implementations
    //               Startup/Shutdown Invocation Order - See Display_Base class
    //
    //               _preStartup
    //               begin()
    //               _postStartup (turn off display or other things)
    //
    //               _preShutdown
    //               // currently nothing defined for middle.
    //               _postShutdown
    //===============================================================
    _preStartup() {
        const self = this;
        self._hardwareStartup();   // (setup SPI, I2C)
        self._hardwareReset();     // (hardware reset for SPI)
        return self;
    }


    _postStartup() {
        return this;
    }


    _preShutdown() {
        const self = this;
        self.enableDisplay(false);  // Turn off screen
        return self;
    }


    _postShutdown() {
        const self = this;
        self._hardwareShutdown(); // (release SPI, I2C hardware)
        return self;
    }
    //===============================================================
    // <END> NON - Adafruit implementations
    //===============================================================


    /**************************************************************************/
    /*!
        @brief  Modified Adafruit startup function - Options are passed in the
                constructor.
        @return  this
    */
    /**************************************************************************/
    begin() {
        const self = this, w = self.WIDTH, h = self.HEIGHT, rotation = self.rotation;

        self.oled_commandList(SH1106_INIT_SEQ_1);

        // Multiplex is based on screen height
        self.oled_commandList([SH1106_SET_MULTIPLEX, (h - 1) & 0xFF,
                               SH1106_DC_DC_CONTROL_MODE_SET, SH1106_DC_DC_ON]);

        self.oled_commandList(SH1106_INIT_SEQ_2);

        // ComPins and Precharge settings vary based on display
        let contrast = self._contrast,
            pageOffset = self.page_offset,
            colOffset = self.column_offset,
            displayOffset = self._displayOffset,
            startLine = self._startLine,
            comPins = 0x02;

        if ((self.WIDTH == 128) && (self.HEIGHT == 32)) {
            comPins = 0x02;
            contrast = 0x8F;
        } else if ((self.WIDTH == 128) && (self.HEIGHT == 64)) {
            comPins = 0x12;
            // 0x8F - [reset] = 0x80
            contrast = 0x8F;
        } else {
            // TBD.
            comPins = 0x02;
            // 0x8F - [reset] = 0x80
            contrast = 0x8F;
        }

        // Update values for use by other functions.
        self._contrast = contrast;
        self.page_offset = pageOffset;
        self.column_offset = colOffset;
        self._displayOffset = displayOffset;
        self._startLine = startLine;
        
        self.oled_commandList([SH1106_SET_DISPLAY_OFFSET, displayOffset & 0xFF,
                               SH1106_SET_START_LINE, startLine & 0xFF,
                               SH1106_SET_COM_PINS, comPins & 0xFF,
                               SH1106_SET_CONTRAST, contrast & 0xFF,
                               SH1106_SET_PRECHARGE, 0xF1]);

        self.oled_commandList(SH1106_INIT_SEQ_3);
        self.setRotation(rotation);
        self._setMaxDirtyWindow();

        if (self._noSplash) {
            self.clearDisplay();
        } else {
            const splash = (h > 32) ? splash1 : splash2;
            if (splash.data && splash.width && splash.height) {
                self.draw1BitBitmap(toInt((w  - splash.width ) / 2),
                                    toInt((h  - splash.height) / 2),
                                    splash.data, 
                                    splash.width, 
                                    splash.height, SH1106_WHITE);
            }
        }
        self.display();


        self.enableDisplay(true);
        return self;
    }


    // REFRESH DISPLAY ---------------------------------------------------------

    /**************************************************************************/
    /*!
        @brief  Push data currently in RAM to SH1106 display.
        @return this
        @note   Drawing operations are not visible until this function is
                called. Call after each graphics command, or after a whole set
                of graphics commands, as best needed by one's own application.
    */
    /**************************************************************************/
    display() {
        const self = this, 
              w = self.WIDTH,
              h = self.HEIGHT,
              buffer = self._buffer,
              colOffset = self.column_offset, 
              pageOffset = self.page_offset,
              colStart = self.window_x1,
              to_write = (self.window_x2 - self.window_x1) + 1,
              pageStart = toInt(self.window_y1 / 8),
              pageEnd = toInt(self.window_y2 / 8) + 1;

        let page, index = colStart + (pageStart * w);
        if (to_write > 0) {
            for (page = (pageStart + pageOffset); page < (pageEnd + pageOffset); page++, index += w) {
                self.oled_commandList([SH1106_PAGE_ADDR | page & 0x0F,
                                       SH1106_LOWER_COLUMN_ADDR | (colStart + colOffset) & 0x0F,
                                       SH1106_HIGHER_COLUMN_ADDR | (((colStart + colOffset) >>> 4) & 0x0F)]);
                // write buffer data one page at a time as the page address does not automatically increment.
                self.oled_data(buffer.subarray(index, index + to_write));
            }
        }
        self._resetDirtyWindow();
        return self;
    }


    /**************************************************************************/
    /*!
        @brief  Change whether display is on or off
        @param   enable True if you want the display ON, false OFF
        @return  this
    */
    /**************************************************************************/
    enableDisplay(aValue) {
        return this.oled_command(!!aValue ? SH1106_DISPLAY_ON : SH1106_DISPLAY_OFF);
    }


    // OTHER HARDWARE SETTINGS -------------------------------------------------


    /***********************************************/
    /***********************************************/
    /***********************************************/
    /* GFX implementations */


    // DRAWING FUNCTIONS -------------------------------------------------------


    /**************************************************************************/
    /*!
        @brief  Draw a horizontal line. This is also invoked by the Adafruit_GFX
                library in generating many higher-level graphics primitives.
        @param  x
                Leftmost column -- 0 at left to (screen width - 1) at right.
        @param  y
                Row of display -- 0 at top to (screen height -1) at bottom.
        @param  w
                Width of line, in pixels.
        @param  color
                Line color, one of: SH1106_BLACK, SH1106_WHITE or SH1106_INVERSE.
        @return this
        @note   Changes buffer contents only, no immediate effect on display.
                Follow up with a call to display(), or with other graphics
                commands as needed by one's own application.
    */
    /**************************************************************************/
    drawFastHLine(x, y, w, color) {
        const self = this,
            rotation = self.rotation,
            WIDTH = self.WIDTH,
            HEIGHT = self.HEIGHT;
        //console.log("SH1106::drawFastHLine(x:%d, y:%d, w:%d, color:%d)", x, y, w, color);
        //throw new Error("stop");
        let bSwap = false;
        switch (rotation) {
            case 1:
                // 90 degree rotation, swap x & y for rotation, then invert x
                bSwap = true;
                //SH1106_swap(x, y);
                (((x) ^= (y)), ((y) ^= (x)), ((x) ^= (y))); // No-temp-var swap operation
                x = WIDTH - x - 1;
                break;
            case 2:
                // 180 degree rotation, invert x and y, then shift y around for height.
                x = WIDTH - x - 1;
                y = HEIGHT - y - 1;
                x -= (w - 1);
                break;
            case 3:
                // 270 degree rotation, swap x & y for rotation,
                // then invert y and adjust y for w (not to become h)
                bSwap = true;
                //SH1106_swap(x, y);
                (((x) ^= (y)), ((y) ^= (x)), ((x) ^= (y))); // No-temp-var swap operation
                y = HEIGHT - y - 1;
                y -= (w - 1);
            break;
        }

        return (bSwap) ? self._drawFastVLineInternal(x, y, w, color) : self._drawFastHLineInternal(x, y, w, color);
    }


    /**************************************************************************/
    /*!
        @brief  Draw a vertical line. This is also invoked by the Adafruit_GFX
                library in generating many higher-level graphics primitives.
        @param  x
                Column of display -- 0 at left to (screen width -1) at right.
        @param  y
                Topmost row -- 0 at top to (screen height - 1) at bottom.
        @param  h
                Height of line, in pixels.
        @param  color
                Line color, one of: SH1106_BLACK, SH1106_WHITE or SH1106_INVERSE.
        @return this
        @note   Changes buffer contents only, no immediate effect on display.
                Follow up with a call to display(), or with other graphics
                commands as needed by one's own application.
    */
    /**************************************************************************/
    drawFastVLine(x, y, h, color) {
        const self = this,
            rotation = self.rotation,
            WIDTH = self.WIDTH,
            HEIGHT = self.HEIGHT;
        //console.log("SH1106::drawFastVLine(x:%d, y:%d, h:%d, color:%d)", x, y, h, color);
        let bSwap = false;
        switch (rotation) {
            case 1:
                // 90 degree rotation, swap x & y for rotation,
                // then invert x and adjust x for h (now to become w)
                bSwap = true;
                //SH1106_swap(x, y);
                (((x) ^= (y)), ((y) ^= (x)), ((x) ^= (y))); // No-temp-var swap operation
                x = WIDTH - x - 1;
                x -= (h - 1);
                break;
            case 2:
                // 180 degree rotation, invert x and y, then shift y around for height.
                x = WIDTH - x - 1;
                y = HEIGHT - y - 1;
                y -= (h - 1);
                break;
            case 3:
                // 270 degree rotation, swap x & y for rotation, then invert y
                bSwap = true;
                //SH1106_swap(x, y);
                (((x) ^= (y)), ((y) ^= (x)), ((x) ^= (y))); // No-temp-var swap operation
                y = HEIGHT - y - 1;
                break;
        }

        return (bSwap) ? self._drawFastHLineInternal(x, y, h, color) : self._drawFastVLineInternal(x, y, h, color);
    }


    /*!
        @brief  Draw a horizontal line with a width and color. Used by public
       methods drawFastHLine,drawFastVLine
            @param x
                       Leftmost column -- 0 at left to (screen width - 1) at right.
            @param y
                       Row of display -- 0 at top to (screen height -1) at bottom.
            @param w
                       Width of line, in pixels.
            @param color
                   Line color, one of: SH1106_BLACK, SH1106_WHITE or
       SH1106_INVERSE.
        @return this
        @note   Changes buffer contents only, no immediate effect on display.
                Follow up with a call to display(), or with other graphics
                commands as needed by one's own application.
    */
    _drawFastHLineInternal(x, y, w, color) {
        const self = this,
            WIDTH = self.WIDTH,
            HEIGHT = self.HEIGHT,
            buffer = self._buffer;
        //console.log("SH1106::_drawFastHLineInternal(x:%d, y:%d, w:%d, color:%d)", x, y, w, color);

        if ((y >= 0) && (y < HEIGHT)) { // Y coord in bounds?
            if (x < 0) {                  // Clip left
                w += x;
                x = 0;
            }
            if ((x + w) > WIDTH) { // Clip right
                w = (WIDTH - x);
            }
            if (w > 0) { // Proceed only if width is positive
                // adjust dirty window as buffer will be modified.
                self.window_x1 = fMin(self.window_x1, x);
                self.window_y1 = fMin(self.window_y1, y);
                self.window_x2 = fMax(self.window_x2, (x + w - 1));
                self.window_y2 = fMax(self.window_y2, y);

                let index = x + toInt(y / 8) * WIDTH;
                const value = (1 << (y & 7));
                //console.log("x:%d y:%d color:%d index:%d, value:%d", x, y, color, index, value);
                switch (color) {
                    case SH1106_WHITE:
                        while(w--)
                            buffer[index++] |= value;
                        break;
                    case SH1106_BLACK:
                        while(w--)
                            buffer[index++] &= ~value;
                        break;
                    case SH1106_INVERSE:
                        while(w--)
                            buffer[index++] ^= value;
                        break;
                }
            }
        }
        return self;
    }


    /**************************************************************************/
    /*!
        @brief  Draw a vertical line with a width and color. Used by public method
                drawFastHLine,drawFastVLine
        @param x
                   Leftmost column -- 0 at left to (screen width - 1) at right.
        @param y
                   Row of display -- 0 at top to (screen height -1) at bottom.
        @param h height of the line in pixels
        @param color
                   Line color, one of: SH1106_BLACK, SH1106_WHITE or
                   SH1106_INVERSE.
        @return this
        @note   Changes buffer contents only, no immediate effect on display.
                Follow up with a call to display(), or with other graphics
                commands as needed by one's own application.
    */
    /**************************************************************************/
    _drawFastVLineInternal(x, y, h, color) {
        const self = this,
            WIDTH = self.WIDTH,
            HEIGHT = self.HEIGHT,
            buffer = self._buffer;
        //console.log("SH1106::drawFastVLineInternal(x:%d, y:%d, h:%d, color:%d)", x, y, h, color);
        if ((x >= 0) && (x < WIDTH)) { // X coord in bounds?
            if (y < 0) { // Clip top
                h += y;
                y = 0;
            }
            if ((y + h) > HEIGHT) { // Clip bottom
                h = (HEIGHT - y);
            }
            if (h > 0) { // Proceed only if height is now positive
                // adjust dirty window as buffer will be modified.
                self.window_x1 = fMin(self.window_x1, x);
                self.window_y1 = fMin(self.window_y1, y);
                self.window_x2 = fMax(self.window_x2, x);
                self.window_y2 = fMax(self.window_y2, (y + h - 1));

                // this display doesn't need ints for coordinates,
                // use local byte registers for faster juggling
                let yTemp = y, hTemp = h;
                let index = x + toInt(yTemp / 8) * WIDTH;
                let mod = yTemp & 7;
                const value = (1 << (yTemp & 7));

                // do the first partial byte, if necessary - this requires some masking
                if (mod) {
                    // mask off the high n bits we want to set
                    mod = 8 - mod;
                    // note - lookup table results in a nearly 10% performance
                    // improvement in fill* functions
                    // uint8_t mask = ~(0xFF >>> mod);
                    let mask = SH1106_VLINE_PRE_MASK[mod];
                    // adjust the mask if we're not going to reach the end of this byte
                    if (hTemp < mod)
                        mask &= (0XFF >>> (mod - hTemp));

                    switch (color) {
                        case SH1106_WHITE:
                            buffer[index] |= mask;
                            break;
                    case SH1106_BLACK:
                            buffer[index] &= ~mask;
                            break;
                    case SH1106_INVERSE:
                          buffer[index] ^= mask;
                          break;
                    }
                    index += WIDTH;
                }

                if (hTemp >= mod) { // More to go?
                    hTemp -= mod;
                    // Write solid bytes while we can - effectively 8 rows at a time
                    if (hTemp >= 8) {
                        if (color == SH1106_INVERSE) {
                            // separate copy of the code so we don't impact performance of
                            // black/white write version with an extra comparison per loop
                            do {
                                buffer[index] ^= 0xFF; // Invert byte
                                index += WIDTH; // Advance index 8 rows
                                hTemp -= 8;      // Subtract 8 rows from height
                            } while (hTemp >= 8);
                        } else {
                            // store a local value to work with
                            let val = (color != SH1106_BLACK) ? 0xFF : 0x00;
                            do {
                              buffer[index] = val;   // Set byte
                              index += WIDTH; // Advance index 8 rows
                              hTemp -= 8;      // Subtract 8 rows from height
                            } while (hTemp >= 8);
                        }
                    }

                    if (hTemp) { // Do the final partial byte, if necessary
                        mod = hTemp & 7;
                        // this time we want to mask the low bits of the byte,
                        // vs the high bits we did above
                        // uint8_t mask = (1 << mod) - 1;
                        // note - lookup table results in a nearly 10% performance
                        // improvement in fill* functions
                        let mask = SH1106_VLINE_POST_MASK[mod];
                        switch (color) {
                            case SH1106_WHITE:
                                buffer[index] |= mask;
                                break;
                            case SH1106_BLACK:
                                buffer[index]  &= ~mask;
                                break;
                            case SH1106_INVERSE:
                                buffer[index]  ^= mask;
                                break;
                        }
                    }
                }
            } // endif positive height
        } // endif x in bounds
        return self;
    }
}

const Adafruit_SH1106_Colors = Object.freeze({
    SH1106_BLACK, SH1106_WHITE, SH1106_INVERSE,
            BLACK,         WHITE,         INVERSE
});

module.exports = {Adafruit_SH1106, Adafruit_SH1106_Colors};
