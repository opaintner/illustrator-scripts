import { Logger } from "./utils/logger.js"

import { Prefs } from "./utils/prefs.js"
import { drawMarks, writeInfo, createWorkLayer } from "./drawing.js"
import {mainDialog} from "./ui/Dialog.js"
import {defaults} from "./ui/defaults.js"


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
  var settings = mainDialog(dev, scriptInfo, prefs, logger);
  if (!settings) return;

  // reset ruler so math works
  doc.rulerOrigin = [0, doc.height];

  // create a layer to hold information
  var layer = createWorkLayer("SEPMARKS", logger);

  // try {
    drawMarks(layer, settings, logger);
    writeInfo(layer, settings);
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
