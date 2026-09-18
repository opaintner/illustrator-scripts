import { Logger } from "./utils/logger.js"

import { Prefs } from "./utils/prefs.js"
import * as drawing from "./drawing.js"
import * as dialogs from "./ui/Dialog.js"


(function () {
  var scriptInfo = {
    title: "Screen Print Separation Marks",
    version: "1.2.4",
    copyright: "Copyright 2026 Josh Duncan, Customized by Owen Paintner for TOPS",
    website: "joshbduncan.com"
  };
  var scriptTitle = "Screen Print Separation Marks";
  
  var logger = new Logger(Folder.desktop + "/screensepmarks.log" + scriptTitle + ".log", "a", undefined, true);
  ////////////////////////////
  // MAIN SCRIPT OPERATIONS //
  ////////////////////////////

  // no need to continue if there is no active document
  if (!app.documents.length) {
    alert("No active document.");
    return;
  }

  /**
   * Settings object used for dialog state and saved presets.
   * @typedef {Object} Settings
   * @property {Boolean} tl - Top-left registration mark enabled.
   * @property {Boolean} tc - Top-center registration mark enabled.
   * @property {Boolean} tr - Top-right registration mark enabled.
   * @property {Boolean} cl - Center-left registration mark enabled.
   * @property {Boolean} cc - Center-center registration mark enabled.
   * @property {Boolean} cr - Center-right registration mark enabled.
   * @property {Boolean} bl - Bottom-left registration mark enabled.
   * @property {Boolean} bc - Bottom-center registration mark enabled.
   * @property {Boolean} br - Bottom-right registration mark enabled.
  * @property {String} tlText - Text for the top-left registration mark.
  * @property {String} trText - Text for the top-right registration mark.
  * @property {String} blText - Text for the bottom-left registration mark.
  * @property {String} brText - Text for the bottom-right registration mark.
   * @property {String} size - Mark size, stored as a unit string.
   * @property {String} stroke - Stroke width, stored as a unit string.
   * @property {String} inset - Inset distance from artboard edge, stored as a unit string.
   * @property {Boolean} invertinset - Whether inset is inverted.
  * @property {Boolean} saveSpaceHorizontal - Move left and right marks inward by one mark size.
  * @property {Boolean} saveSpaceVertical - Move top and bottom marks inward by one mark size.
   * @property {String} color - Spot swatch name used for registration marks.
   * @property {Boolean} blanktextbox - Whether to add a blank custom text box.
   * @property {Boolean} spots - Whether to add spot color names to the artwork.
   * @property {Boolean} file - Whether to include file information text.
   * @property {Boolean} timestamp - Whether to include timestamp text.
   * @property {String} position - Output text vertical position, either "Top" or "Bottom".
   * @property {String} alignment - Output text horizontal alignment, either "Left" or "Right".
   */
  var defaults = {};
  /**
   * Built-in default settings stored as the "[Default]" preset.
   */
  defaults["[Default]"] = {
    tl: true,
    tc: true,
    tr: true,
    cl: false,
    cc: false,
    cr: false,
    bl: true,
    bc: false,
    br: true,
    tlText: "Add custom info here.",
    trText: "Add custom info here.",
    blText: "Add custom info here.",
    brText: "Add custom info here.",
    size: "0.8 in",
    stroke: "1.0 pt",
    inset: "0.2 in",
    color: "[Registration]",
    invertinset: true,
    saveSpaceHorizontal: false,
    saveSpaceVertical: false,
    blanktextbox: true,
    spots: false,
    file: false,
    timestamp: false,
    position: "Top",
    alignment: "Left",
    referenceObject: 1
  };
  // TODO: Find a better way to do this settings thingy - it seems wrong somehow

  // grab document and swatch info
  var doc = app.activeDocument;


  // set development mode
  var dev = true;

  // setup development logging
  var logger;
  if (dev) {
    var currentFile = new File($.fileName);
    var logFilePath = Folder.desktop + "/" + currentFile.name + ".log";
    logger = new Logger(logFilePath, "a", undefined, true);
    logger.log("**DEV MODE**", $.fileName);
  } else {
    logger = {};
    logger.log = function (text) {
      $.writeln(text);
    };
  }

  // load user prefs
  var prefs;
  prefs = new Prefs(undefined, scriptInfo.version);
  prefs.load(defaults);

  // show the dialog
  var settings = dialogs.mainDialog(dev, scriptInfo, prefs, logger);
  if (!settings) return;

  // reset ruler so math works
  doc.rulerOrigin = [0, doc.height];

  // create a layer to hold information
  var layer = drawing.createWorkLayer("SEPMARKS", logger);

  // try {
    drawing.drawMarks(layer, settings, logger, swatches, spotColors);
    drawing.writeInfo(layer, settings, swatches, spotColors);
  // } catch (e) {
  //   logger.log("ERROR!", $.fileName + ":" + $.line, e);
  //   alert("ERROR!\n" + e.message);
  //   layer.remove();
  //   return;
  // }

  // This try-catch was removed because it was catching the error and not causing an exception in the debugger so I was unable to find exactly where things were happening.


  // place layer in correct position and don't lock it
  layer.zOrderPosition = -1;
  layer.locked = false;

  

})();
