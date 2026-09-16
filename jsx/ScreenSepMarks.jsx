/*
ScreenSepMarks.jsx for Adobe Illustrator
---------------------------------------
Easily add screen printing registration marks
and spot color info to the current document.

Author
------
Josh Duncan
joshbduncan@gmail.com
https://joshbduncan.com
https://github.com/joshbduncan/

Wanna Support Me?
-----------------
Most of the things I make are free to download but if you would like
to support me that would be awesome and greatly appreciated!
https://joshbduncan.com/software.html

License
-------
This script is distributed under the MIT License.
See the LICENSE file for details.

Changelog
---------
1.0.0            initial release
1.0.1            updated placement from dropdown to anchor checkboxes
1.0.2            added unit specifier to size, stroke, and inset along with converter function
1.0.3            added custom color selector
1.0.4            added file info, date, and time output options
1.0.5            rebuilt entire setting dialog
1.0.6            last used settings now save to preferences and auto-load on next run
1.1.0            added save/delete presets feature with a new save/replace dialog
1.1.1            setup defaults `[Default]` that save to preferences and load on first run, can be updated by user
1.1.2            took previous last used setting and added them to dropdown selection as [Last Used]
1.1.3            any changes to settings now empties preset dropdown selection to clear confusion
1.1.4            cleaned up a bug when no spot colors were found or no info was requested
1.1.5            all new save settings function that uses a separate instead of clogging up app.preferences
1.2.0            works with any spot color names, updated file info, updated saved settings/preferences
1.2.1 2025-02-06 fixed preset overwrite protection
1.2.2 2025-06-20 fixed input validation
1.2.3 2026-03-12 fixed registration marks to use actual spot color
1.2.4 2026-04-09 fix nested target directive
*/

//@target illustrator

(function () {
  var scriptTitle = "Screen Print Separation Marks";
  var scriptVersion = "1.2.4";
  var scriptCopyright = "Copyright 2026 Josh Duncan, Customized by Owen Paintner for TOPS";
  var website = "joshbduncan.com";

  //////////////
  // INCLUDES //
  //////////////

  /**
   * Module for easy file logging from within Adobe ExtendScript.
   * @param {String} fp File path for the log file. Defaults to `Folder.userData/{base_script_file_name}.log`.
   * @param {String} mode Optional log file write mode. Write `w` mode or append `a` mode. If write mode 'w', the log file will be overwritten on each script run. Defaults to `w`.
   * @param {Number} sizeLimit Log file size limit (in bytes) for rotation. Defaults to 5,000,000.
   * @param {Boolean} console Forward calls to `Logger.log()` to the JavaScript Console via `$.writeln()`. Defaults to `false`.
   */
  function Logger(fp, mode, sizeLimit, console) {
    if (typeof fp == "undefined")
      fp = Folder.userData + "/" + resolveBaseScriptFromStack() + ".log";

    this.mode = typeof mode !== "undefined" ? mode.toLowerCase() : "w";
    this.console = typeof console !== "undefined" ? console : false;
    this.file = new File(fp);
    this.badPath = false;

    // rotate log if too big
    sizeLimit = typeof sizeLimit !== "undefined" ? Number(sizeLimit) : 5000000;
    if (this.file.length > sizeLimit) {
      var ts = Date.now();
      var rotatedFile = new File(this.file + ts + ".bak");
      this.file.copy(rotatedFile);
      this.file.remove();
      alert(this.file);
    }
  }

  Logger.prototype = {
    /**
     * Backup the log file.
     * @returns {FileObject} Backup file object.
     */
    backup: function () {
      var backupFile = new File(this.file + ".bak");
      this.file.copy(backupFile);
      return backupFile;
    },
    /**
     * Write data to the log file.
     * @param {String} text One or more strings to write, which are concatenated to form a single string.
     * @returns {Boolean} Returns true if log file is successfully written, false if unsuccessful.
     */
    log: function (text) {
      // no need to keep alerting when the log path is bad
      if (this.badPath) return false;

      var f = this.file;
      var m = this.mode;
      var ts = new Date().toLocaleString();

      // ensure parent folder exists
      if (!f.parent.exists) {
        if (!f.parent.parent.exists) {
          alert("Bad log file path!\n'" + this.file + "'");
          this.badPath = true;
          return false;
        }
        f.parent.create();
      }

      // grab all arguments
      var args = ["[" + ts + "]"];
      for (var i = 0; i < arguments.length; ++i) args.push(arguments[i]);

      // write the data
      try {
        f.encoding = "UTF-8";
        f.open(m);
        f.writeln(args.join(" "));
      } catch (e) {
        $.writeln("Error writing file:\n" + f);
        return false;
      } finally {
        f.close();
      }

      // write `text` to the console if requested
      if (this.console) $.writeln(args.slice(1, args.length).join(" "));

      return true;
    },
    /**
     * Open the log file.
     */
    open: function () {
      this.file.execute();
    },
    /**
     * Reveal the log file in the platform-specific file browser.
     */
    reveal: function () {
      this.file.parent.execute();
    },
  };
  /**
   * Open a url in the system browser.
   * @param {String} url URL to open.
   */
  function openURL(url) {
    var html = new File(Folder.temp.absoluteURI + "/aisLink.html");
    html.open("w");
    var htmlBody =
      '<html><head><META HTTP-EQUIV=Refresh CONTENT="0; URL=' +
      url +
      '"></head><body><p></p></body></html>';
    html.write(htmlBody);
    html.close();
    html.execute();
  }
  /**
   * Parse a ScriptUI `edittext` value into a valid `UnitType` number.
   * @param {Number|String} n - Value to parse.
   * @param {Number} defaultValue - Default value to return if `n` is invalid.
   * @param {String} defaultUnit - Default unit type to return the input as if not included in `n`.
   * @returns {UnitValue}
   */
  function parseNumberInput(n, defaultValue, defaultUnit) {
    defaultValue = typeof defaultValue !== "undefined" ? defaultValue : 0;

    var rulerUnits = app.activeDocument.rulerUnits
      .toString()
      .split(".")[1]
      .toLowerCase();
    defaultUnit = typeof defaultUnit !== "undefined" ? defaultUnit : rulerUnits;

    var val = UnitValue(n);
    if (val.type === "?") {
      val = UnitValue(n, defaultUnit);
      if (isNaN(val.value)) {
        app.beep();
        val = UnitValue(defaultValue, defaultUnit);
      }
    }
    return val;
  }
  /**
   * Read ExtendScript "json-like" data from file.
   * @param {File} f File object to read.
   * @returns {Object} Evaluated JSON data.
   */
  function readJSONData(f) {
    var json, obj;
    try {
      f.encoding = "UTF-8";
      f.open("r");
      json = f.read();
    } catch (e) {
      alert("Error loading file:\n" + f);
    } finally {
      f.close();
    }
    obj = eval(json);
    return obj;
  }
  /**
   * Write ExtendScript "json-like" data to disk.
   * @param {Object} data Data to be written.
   * @param {File} f File object to write to.
   * @returns {Boolean} Write success.
   */
  function writeJSONData(data, f) {
    try {
      f.encoding = "UTF-8";
      f.open("w");
      f.write(data.toSource());
    } catch (e) {
      alert("Error writing file:\n" + f);
      return false;
    } finally {
      f.close();
    }
    return true;
  }

  /**
   * Determine the base calling script from the current stack.
   * @returns {String} Initial script name.
   */
  function resolveBaseScriptFromStack() {
    var stack = $.stack.split("\n");
    var foo, bar;
    for (var i = 0; i < stack.length; i++) {
      foo = stack[i];
      if (foo[0] == "[" && foo[foo.length - 1] == "]") {
        bar = foo.slice(1, foo.length - 1);
        if (isNaN(bar)) {
          break;
        }
      }
    }
    return bar;
  }

  /**
   * Module for easily storing script preferences.
   * @param {String} fp File path for the for the saved preferences "JSON-like" file. Defaults to `Folder.userData/{base_script_file_name}.json`.
   * @param {String} version Optional script version number to include in the preferences file. Helps with debugging.
   * @param {Object} logger Optional logger for debugging. Defaults to `$.writeln()`.
   */
  function Prefs(fp, version, logger) {
    if (typeof fp == "undefined")
      fp = Folder.userData + "/" + resolveBaseScriptFromStack() + ".json";

    this.version = typeof version !== "undefined" ? version : null;
    this.file = new File(fp);
    this.data = {};
    this.logger = logger;

    if (typeof this.logger == "undefined") {
      this.logger = {};
      this.logger.log = function (text) {
        var args = [];
        for (var i = 0; i < arguments.length; ++i) args.push(arguments[i]);
        $.writeln(args.join(" "));
      };
      this.logger.open = function () {
        try {
          this.file.execute();
        } catch (e) {
          $.writeln("Unable to open log file:", e);
        }
      };
      this.logger.reveal = function () {
        try {
          this.file.parent.execute();
        } catch (e) {
          $.writeln("Unable to reveal prefs folder:", e);
        }
      };
    }
  }

  Prefs.prototype = {
    /**
     * Backup the prefs file.
     * @returns {FileObject} Backup file object.
     */
    backup: function () {
      var f = this.file;
      var backupFile = new File(f + ".bak");

      this.logger.log("backing up prefs file:", backupFile);

      f.copy(backupFile);
      return backupFile;
    },
    /**
     * Load preferences file data into the `prefs.data` object.
     * @param {Object} defaultData Default data to load if the data file does not exist.
     * @returns {Boolean} Load success.
     */
    load: function (defaultData) {
      defaultData = typeof defaultData !== "undefined" ? defaultData : {};
      var f = this.file;
      var json;

      this.logger.log("loading prefs file:", f);

      if (f.exists) {
        try {
          json = readJSONData(f);
        } catch (e) {
          // Don't rename/reveal the prefs file (no noisy .bak on every launch).
          // Instead, attempt to copy the corrupt file to a timestamped .corrupt file
          // for later inspection and continue using defaults.
          try {
            var ts = Date.now();
            var corruptFile = new File(f + "." + ts + ".corrupt");
            f.copy(corruptFile);
            alert(
              "Preferences file parse error. A backup was written to:\n" +
                corruptFile,
            );
          } catch (ex) {
            alert(
              "Preferences file parse error. Failed to create backup.\nOriginal file:\n" +
                f,
            );
            this.logger.log("prefs parse error; backup failed:", ex);
          }
          json = {};
          json.data = defaultData;
        }
      } else {
        json = {};
        json.data = defaultData;
      }

      this.data = json.data;
      return true;
    },
    /**
     * Open the log file.
     */
    open: function () {
      this.file.execute();
    },
    /**
     * Reveal the preferences file in the platform-specific file browser.
     */
    reveal: function () {
      this.file.parent.execute();
    },
    /**
     * Write preferences to disk. Only `prefs.data` will be saved.
     * @returns {Boolean} Save success.
     */
    save: function () {
      var f = this.file;

      this.logger.log("writing prefs file:", f);

      // ensure parent folder exists
      if (!f.parent.exists) {
        if (!f.parent.parent.exists) {
          Error.runtimeError(
            1,
            "Bad preferences file path!\n" + this.file + "'",
          );
          return false;
        }
        f.parent.create();
      }

      // setup the data object
      var d = {
        data: this.data,
        version: this.version,
        timestamp: Date.now(),
      };
      return writeJSONData(d, f);
    },
  };
  /**
   * Dialog for saving/overwriting presets.
   * @param {Array} currentOptions Current presets (can be overwritten).
   * @returns {String|Boolean} Preset name on OK, false on Cancel.
   */
  function savePresetDialog(currentOptions) {
    var win = new Window("dialog");
    win.text = "Save Settings";
    win.orientation = "column";
    win.alignChildren = ["fill", "top"];
    win.margins = 18;

    win.add("statictext", undefined, "Save current settings as:");
    var name = win.add("edittext");
    name.preferredSize.width = 250;
    name.active = true;

    var cbReplace = win.add("checkbox", undefined, "Replace settings:");
    var replace = win.add("dropdownlist", undefined, currentOptions);
    replace.enabled = false;
    replace.preferredSize.width = 250;

    // remove [last used] since it shouldn't be overwritten
    replace.remove(replace.find("[Last Used]"));

    cbReplace.onClick = function () {
      replace.enabled = cbReplace.value ? true : false;
      name.enabled = cbReplace.value ? false : true;
    };

    // window buttons
    var gWindowButtons = win.add("group", undefined);
    gWindowButtons.orientation = "row";
    gWindowButtons.alignChildren = ["left", "center"];
    gWindowButtons.alignment = ["center", "top"];

    var btOK = gWindowButtons.add("button", undefined, "OK");
    var btCancel = gWindowButtons.add("button", undefined, "Cancel");

    btOK.onClick = function () {
      var saveName = name.text;

      if (!cbReplace.value) {
        // check to ensure a name was provided
        if (saveName.length == 0) {
          alert(
            "No name provided!\nMake sure to provide a save name or pick a current present to replace.",
          );
          return;
        }

        // check to see if preset already exist
        for (var i = 0; i < currentOptions.length; i++) {
          if (saveName == currentOptions[i]) {
            alert(
              "Preset Already Exist\nPreset '" +
                saveName +
                "' has already been saved. To overwrite your currently saved settings, use the 'Replace Settings' method.",
            );
            cbReplace.notify("onClick");
            replace.selection = replace.find(saveName);
            return;
          }
        }
      }

      win.close(1);
    };

    // if "ok" button clicked then return savename
    if (win.show() == 1) {
      var saveName;
      if (cbReplace.value && replace.selection) {
        saveName = replace.selection.text;
      } else if (!cbReplace.value && name.text) {
        saveName = name.text;
      }
      return saveName;
    } else {
      return false;
    }
  }

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

  /**
   * Built-in default settings stored as the "[Default]" preset.
   */
  var defaults = {};
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
    referenceObject: 1,
  };

  // grab document and swatch info
  var doc = app.activeDocument;
  var swatches = doc.swatches;
  var spotColors = doc.spots;

  // set development mode
  var dev = $.getenv("USER") === "jbd" ? true : false;

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
  prefs = new Prefs(undefined, scriptVersion);
  prefs.load(defaults);

  // show the dialog
  var settings = dialog();
  if (!settings) return;

  // reset ruler so math works
  doc.rulerOrigin = [0, doc.height];

  // create a layer to hold information
  var layer = createWorkLayer("SEPMARKS");

  try {
    drawMarks(layer, settings);
    writeInfo(layer, settings);
  } catch (e) {
    logger.log("ERROR!", $.fileName + ":" + $.line, e);
    alert("ERROR!\n" + e.message);
    layer.remove();
    return;
  }

  // place layer in correct position and don't lock it
  layer.zOrderPosition = -1;
  layer.locked = false;

  //////////////////////////////
  // SCRIPT DRAWING FUNCTIONS //
  //////////////////////////////

  /**
   * Find or create a work layer for the script and clear its contents if necessary.
   *
   * @param {String} name - Name of the layer to use or create.
   * @returns {Layer} The work layer for drawing marks and text.
   */
  function createWorkLayer(name) {
    var layer;
    try {
      layer = doc.layers.getByName(name);
      logger.log(
        "previous work layer found, removing all page items, unlocking layer",
      );
      layer.locked = false;
      layer.pageItems.removeAll();
    } catch (e) {
      $.writeln(e.message);
      layer = doc.layers.add();
      layer.name = name;
    }
    return layer;
  }

  /**
   * Return a spot swatch by name, falling back to [Registration] if missing.
   *
   * @param {String} name - Spot swatch name to look up.
   * @returns {Spot} The requested spot swatch or the registration swatch.
   */
  function getSpotColor(name) {
    var color;
    try {
      color = spotColors.getByName(name);
    } catch (e) {
      $.writeln(e.message);
      logger.log(
        "spot color swatch '" +
          name +
          "' not found, defaulting to [Registration]",
      );
      color = swatches.getByName("[Registration]");
    }
    return color;
  }

  /**
   * Draw registration marks based on the current settings.
   *
   * @param {Layer} layer - The layer where marks should be created.
   * @param {Settings} settings - Dialog settings controlling placement, size, color, and inset.
   */
  function drawMarks(layer, settings) {
    // convert provided inputs to points
    var size = UnitValue(settings.size).as("pt");
    var stroke = UnitValue(settings.stroke).as("pt");
    var inset = UnitValue(settings.inset).as("pt");
    // make sure spot color is available
    var color = new SpotColor();
    color.spot = getSpotColor(settings.color);

    //invert inset value, if applicable
    if (settings.invertinset){
      inset = inset * -1
    }

    if (settings.referenceObject == 0) {
    // calculate artboard edges
    var top = inset + size / 2;
    var bottom = doc.height - inset - size / 2;
    var left = inset + size / 2;
    var right = doc.width - inset - size / 2;
    var centerX = doc.width / 2;
    var horizontalOffset = settings.saveSpaceHorizontal ? size : 0;
    var verticalOffset = settings.saveSpaceVertical ? size : 0;
    var centerY = doc.height / 2;
    var marks = {
      tl: { x: left - size / 2 + horizontalOffset, y: top - size / 2 + verticalOffset },
      tc: { x: centerX, y: top - size / 2 + verticalOffset },
      tr: { x: right + size / 2 - horizontalOffset, y: top - size / 2 + verticalOffset },
      cl: { x: left - size / 2 + horizontalOffset, y: centerY },
      cr: { x: right + size / 2 - horizontalOffset, y: centerY },
      bl: { x: left - size / 2 + horizontalOffset, y: bottom + size / 2 - verticalOffset },
      bc: { x: centerX, y: bottom + size / 2 - verticalOffset },
      br: { x: right + size / 2 - horizontalOffset, y: bottom + size / 2 - verticalOffset },
    };
  } else if (settings.referenceObject == 1) {
    // calculate selection visible bounds
    if (doc.selection.length == 0) {
      alert("No selection found. Please select an object to use as a reference.");
      return;
    }
    alert("Selection found. Using selection bounds as reference for registration marks.");
    var selBounds = doc.selection[0].visibleBounds;
    alert("Selection bounds: " + selBounds);
    var top = selBounds[1]*-1;
    var bottom = selBounds[3]*-1;
    var left = selBounds[0];
    var right = selBounds[2];
    var centerX = (left + right) / 2;
    var centerY = (top + bottom) / 2;
    var horizontalOffset = settings.saveSpaceHorizontal ? size : 0;
    var verticalOffset = settings.saveSpaceVertical ? size : 0;
    var marks = {
      tl: { x: left + inset + horizontalOffset, y: top + inset + verticalOffset },
      tc: { x: centerX, y: top + inset + verticalOffset },
      tr: { x: right - inset - horizontalOffset, y: top + inset + verticalOffset },
      cl: { x: left + inset + horizontalOffset, y: centerY },
      cr: { x: right - inset - horizontalOffset, y: centerY },
      bl: { x: left + inset + horizontalOffset, y: bottom - inset - verticalOffset },
      bc: { x: centerX, y: bottom - inset - verticalOffset },
      br: { x: right - inset - horizontalOffset, y: bottom - inset - verticalOffset },
    };
  }

    for (var prop in marks) {
      if (!settings[prop]) continue;
      logger.log(
        "drawing mark",
        prop,
        "at (" + marks[prop].x + ", " + marks[prop].y + ")",
      );

      var rotation = 0;
      var center = false;
      var name = "";
      if (prop === "tr") {
        rotation = 90;
        name = "tr";
      } else if (prop === "br") {
        rotation = 0;
        name = "br";
      } else if (prop === "bl") {
        rotation = 270;
        name = "bl";
      } else if (prop === "tl") {
        rotation = 180;
        name = "tl";
      } else if (prop === "tc") {
        rotation = 180;
        center = true;
        name = "tc";
      } else if (prop === "bc") {
        rotation = 0;
        center = true;
        name = "bc";
      } else if (prop === "cr") {
        rotation = 90;
        center = true;
        name = "cr";
      } else if (prop === "cl") {
        rotation = -90;
        center = true;
        name = "cl";
      }

      makeReg(
        layer,
        marks[prop].x,
        marks[prop].y,
        size,
        color,
        rotation,
        stroke,
        center,
        name,
        settings[name + "Text"]
      );
    }

    // Center all registration mark text frames after they have been created.
    verticalCenterTextFrame(layer);
  }

  /**
   * Create a registration mark at a specific point on the given layer.
   *
   * @param {Layer} layer - The Illustrator layer to add the mark to.
   * @param {Number} x - The horizontal center position for the mark.
   * @param {Number} y - The vertical center position for the mark.
   * @param {Number} size - The overall size of the mark (width and height of the crosshair).
   * @param {SpotColor} color - The spot color to use for both lines.
   * @param {Number} rotation - The rotation angle for the mark, in degrees.
   * @param {Number} strokeWeight - The stroke width for the mark lines, in points.
  * @param {Boolean} center - Whether the mark is a center mark (single line) or a corner mark (L-shaped). If true, the mark is centered at (x, y); if false, the mark's bottom-left corner is at (x, y).
  * @param {String} text - Text to inject into the corner mark's area-text frame.
   */
  function makeReg(layer, x, y, size, color, rotation, strokeWeight, center, name, text) {
    // make a group to hold reg mark parts
      var regGroup = layer.groupItems.add();
      if (!center) {
      // draw an L-shaped mark with the bottom-left corner at the provided point
      var xLine = regGroup.pathItems.add();
      xLine.setEntirePath([
        [x, -y],
        [x + size, -y],
      ]);
      xLine.strokeColor = color;
      xLine.stroked = true;
      xLine.strokeWidth = strokeWeight;
      xLine.filled = false;
      var yLine = regGroup.pathItems.add();
      yLine.setEntirePath([
        [x, -y],
        [x, -y - size],
      ]);
      yLine.strokeColor = color;
      yLine.stroked = true;
      yLine.strokeWidth = strokeWeight;
      yLine.filled = false;
      regGroup.rotate(rotation, true, true, true, true, Transformation.TOPLEFT);
      var textbox = regGroup.pathItems.rectangle(regGroup.top, regGroup.left, size, size);
      var textFrame = regGroup.textFrames.areaText(textbox);
      textFrame.contents = text || "";
      textFrame.textRange.characterAttributes.size = 12;
      textFrame.textRange.fillColor = color;
      textFrame.textRange.justification = Justification.CENTER;


    } else {
      //make a center mark instead
      var yLine = regGroup.pathItems.add();
      yLine.setEntirePath([
        [x, -y],
        [x, -y - size],
      ]);
      yLine.strokeColor = color;
      yLine.stroked = true;
      yLine.strokeWidth = strokeWeight;
      yLine.filled = false;
      regGroup.rotate(rotation, true, true, true, true, Transformation.TOP);
    }
    regGroup.name = "RegMark_" + name;
  }

  /**
   * Add optional information text to the work layer.
   *
   * @param {Layer} layer - The layer to add text frames to.
   * @param {Settings} settings - Dialog settings controlling which text output is created.
   */
  function writeInfo(layer, settings) {
    var registrationColor = swatches.getByName("[Registration]");
    //insert blank textbox for custom data
    if (settings.blanktextbox) {

      // create a text frame
      var spotColorTextFrame = layer.textFrames.add();
      spotColorTextFrame.textRange.characterAttributes.size = 9;
      spotColorTextFrame.textRange.fillColor = registrationColor.color;
      spotColorTextFrame.top =
        settings.position == "Top"
          ? 0
          : -doc.height + spotColorTextFrame.height;


        // add spot color name to text frame
        tr = spotColorTextFrame.words.add("Add custom info here.");

      // move text horizontally
      spotColorTextFrame.textRange.justification =
        settings.alignment == "Right"
          ? Justification.RIGHT
          : Justification.LEFT;
      spotColorTextFrame.left =
        settings.alignment == "Right"
          ? doc.width - spotColorTextFrame.width
          : 0;
    }
    // insert spot color info first
    if (settings.spots) {
      // create a text frame
      var spotColorTextFrame = layer.textFrames.add();
      spotColorTextFrame.textRange.characterAttributes.size = 9;
      spotColorTextFrame.textRange.fillColor = registrationColor.color;
      spotColorTextFrame.top =
        settings.position == "Top"
          ? 0
          : -doc.height + spotColorTextFrame.height;

      // add each spot color (and color characters)
      var spotColor, tr;
      for (var i = 0; i < spotColors.length; i++) {
        spotColor = doc.swatches.getByName(spotColors[i].name);

        // skip registration color
        if (spotColor.name == "[Registration]") continue;

        // add spot color name to text frame
        tr = spotColorTextFrame.words.add(spotColor.name);

        // color each character with the current spot color
        for (var j = 0; j < tr.characters.length; j++) {
          tr.characters[j].filled = true;
          tr.characters[j].fillColor = spotColor.color;
        }
      }

      // move text horizontally
      spotColorTextFrame.textRange.justification =
        settings.alignment == "Right"
          ? Justification.RIGHT
          : Justification.LEFT;
      spotColorTextFrame.left =
        settings.alignment == "Right"
          ? doc.width - spotColorTextFrame.width
          : 0;
    }

    var infoItems = [];
    if (settings.file) infoItems.push(doc.name);
    if (settings.timestamp) {
      var timestamp = new Date();
      infoItems.push(timestamp.toLocaleString());
    }

    if (infoItems.length > 0) {
      var infoTextFrame = layer.textFrames.add();
      infoTextFrame.textRange.characterAttributes.size = 9;
      infoTextFrame.textRange.fillColor = registrationColor.color;
      infoTextFrame.contents = infoItems.join(" | ");
      infoTextFrame.textRange.justification =
        settings.alignment == "Left" ? Justification.RIGHT : Justification.LEFT;
      infoTextFrame.top =
        settings.position == "Top" ? 0 : -doc.height + infoTextFrame.height;
      infoTextFrame.left =
        settings.alignment == "Left" ? doc.width - infoTextFrame.width : 0;
    }
  }

  /**
   * Vertically center every area-text frame contained by a layer.
   *
   * Registration mark text frames are nested inside group items, so this
   * function recursively walks the layer and its groups before selecting the
   * complete set of area-text frames. It then runs Illustrator's native
   * frame-alignment action once for the whole selection. The action is loaded
   * from a temporary file because ExtendScript does not expose this alignment
   * operation directly through the TextFrame object model.
   *
   * @param {Layer} layer - The layer to search for area-text frames.
   * @returns {void} Does nothing when the layer is invalid or contains no
   * area-text frames.
   */
  function verticalCenterTextFrame(layer) {
    // Safety check to ensure a valid layer was passed
    if (!layer || layer.typename !== "Layer") return;

    var validTextFrames = [];

    // Include area text frames nested inside the registration mark groups.
    collectAreaTextFrames(layer);

    /**
     * Recursively collect area-text frames from a layer or group item.
     *
     * @param {Layer|GroupItem} container - Object whose direct text frames and
     * nested groups should be searched.
     * @returns {void} Adds unique area-text frames to `validTextFrames`.
     */
    function collectAreaTextFrames(container) {
      for (var i = 0; i < container.textFrames.length; i++) {
        var item = container.textFrames[i];
        if (item.kind !== TextType.AREATEXT) continue;

        var alreadyCollected = false;
        for (var j = 0; j < validTextFrames.length; j++) {
          if (validTextFrames[j] === item) {
            alreadyCollected = true;
            break;
          }
        }
        if (!alreadyCollected) validTextFrames.push(item);
      }

      for (var k = 0; k < container.groupItems.length; k++) {
        collectAreaTextFrames(container.groupItems[k]);
      }
    }

    // 2. If valid boxes are found, isolate selection to them and run the action
    if (validTextFrames.length > 0) {
        // Clear global selection first
        app.activeDocument.selection = null;
        
        for (var j = 0; j < validTextFrames.length; j++) {
            validTextFrames[j].selected = true;
        }
        
        // Run the action once for the whole group
        setTextFrameVerticalJustificationToCenter();
    }

    /**
     * Run Illustrator's recorded action that centers text vertically in its
     * area-text frame. The action operates on the current Illustrator
     * selection, which is prepared by `verticalCenterTextFrame()`.
     *
     * @param {TextFrame} textFrame - Retained for compatibility with the
     * original helper signature; the action uses the current selection.
     * @returns {void} Runs the embedded alignment action.
     */
    function setTextFrameVerticalJustificationToCenter(textFrame) {
      var embeddedActionData = [
          "/version 3",
          "/name [ 5",
          "	5365742031",
          "]",
          "/isOpen 1",
          "/actionCount 1",
          "/action-1 {",
          "	/name [ 8",
          "		416374696f6e2031",
          "	]",
          "	/keyIndex 0",
          "	/colorIndex 0",
          "	/isOpen 1",
          "	/eventCount 1",
          "	/event-1 {",
          "		/useRulersIn1stQuadrant 0",
          "		/internalName (adobe_frameAlignment)",
          "		/localizedName [ 24",
          "			417265612054657874204672616d65416c69676e6d656e74",
          "		]",
          "		/isOpen 0",
          "		/isOn 1",
          "		/hasDialog 0",
          "		/parameterCount 1",
          "		/parameter-1 {",
          "			/key 1717660782",
          "			/showInPalette 4294967295",
          "			/type (integer)",
          "			/value 1",
          "		}",
          "	}",
          "}"
      ].join("\n");
      var actionSetName = "Set 1";
      var actionName = "Action 1";

      /**
       * Load, execute, and unload an Illustrator action from a temporary file.
       *
       * @param {String} data - Serialized Illustrator action data.
       * @param {String} setName - Name of the action set to load and run.
       * @param {String} action - Name of the action within the set to execute.
       * @returns {void} Removes the temporary action file after execution.
       */
      function runEmbeddedAction(data, setName, action) {
      // Create a temporary file to hold the action data
      var tempFile = new File(Folder.temp + "/temp_illustrator_action.atn");
      
      try {
          tempFile.open("w");
          tempFile.write(data);
          tempFile.close();
          
              // Force Illustrator to update its state before running the action
              app.redraw(); 
              
              // Load and execute the action
              app.loadAction(tempFile);
              app.doScript(action, setName);
              
              // Delay unloading slightly or let Illustrator catch up
              app.redraw();
              app.unloadAction(setName, "");
      } 
      catch(error) {
          alert("Error executing action: " + error.message);
      } 
      finally {
          // Clean up and delete the temporary file from the hard drive
          if (tempFile.exists) {
              tempFile.remove();
          }
      }
    }

    // Run the function
    runEmbeddedAction(embeddedActionData, actionSetName, actionName);
    }
  }

  ////////////////////////
  // MAIN SCRIPT DIALOG //
  ////////////////////////

  /**
   * State consumed by the registration-mark preview renderer.
   *
  * All measurement values are stored internally as points. The dialog
  * converts its unit-aware input values before calling `update()`, which
  * keeps the drawing code independent of the document ruler units. The
  * preview uses the state to render a schematic only; it does not create or
  * modify Illustrator page items.
   *
   * @typedef {Object} RegistrationPreviewData
   * @property {Number} size - Registration-mark size in points.
   * @property {Number} stroke - Registration-mark stroke width in points.
   * @property {Number} inset - Distance used to illustrate the mark inset in
   * points.
   * @property {String} insetDirection - Whether the illustrated inset is
   * "Inset" or "Outset".
   * @property {String} color - Spot color name displayed in the summary.
   * @property {String} reference - Reference-object label displayed in the
   * summary, normally "Artboard" or "Selection".
  * @property {Number} referenceIndex - Selected reference-object index. It is
  * retained in preview state for completeness but is not currently used to
  * alter the schematic.
   * @property {Boolean} saveSpaceHorizontal - Whether horizontal space-saving
   * placement is illustrated.
   * @property {Boolean} saveSpaceVertical - Whether vertical space-saving
   * placement is illustrated.
   * @property {String} unit - Unit suffix used for displayed measurements.
   */

  /**
   * API returned by {@link createRegistrationPreview}.
   *
   * @typedef {Object} RegistrationPreview
   * @property {Panel} control - The ScriptUI panel that owns the preview.
   * @property {Function} update - Merge new preview state and request a redraw.
   */

  /**
   * Create the schematic registration-mark preview used by the settings
   * dialog.
   *
   * The preview owns both its ScriptUI panel and its drawing state. Callers
   * should update it through the returned `update()` method rather than
   * reaching into ScriptUI graphics directly. Calling `update()` merges only
   * the supplied properties, refreshes the panel, and relayouts its parent
   * when possible.
   *
  * The renderer draws a paper boundary, a registration mark, dimension
  * annotations for size/inset/stroke, and a compact text summary. The mark
  * size is schematic rather than proportional to the entered size; inset and
  * stroke display values are bounded for layout purposes. The result is not a
  * scale-accurate artboard preview.
   *
   * @param {Group|Panel} parent - ScriptUI container in which the preview
   * panel is created.
   * @returns {RegistrationPreview} Preview panel and state-update API.
   */
  function createRegistrationPreview(parent) {
    var control = parent.add("panel", undefined);
    control.preferredSize = [300, 150];
    control.alignment = ["fill", "top"];

    var data = {
      size: 0,
      stroke: 0,
      inset: 0,
      insetDirection: "Inset",
      color: "[Registration]",
      reference: "Artboard",
      referenceIndex: 0,
      saveSpaceHorizontal: false,
      saveSpaceVertical: false,
      unit: "pt",
    };

    /**
     * Draw a single stroked line in the preview graphics context.
     *
     * A new path is created for each line because ScriptUI graphics paths are
     * mutable drawing objects. This helper centralizes the path construction
     * used by marks, dimension extensions, and arrowheads.
     *
     * @param {ScriptUIGraphics} graphics - Graphics context supplied by the
     * preview panel's `onDraw` handler.
     * @param {ScriptUIPen} pen - Pen used to stroke the line.
     * @param {Number} x1 - Starting x-coordinate in preview pixels.
     * @param {Number} y1 - Starting y-coordinate in preview pixels.
     * @param {Number} x2 - Ending x-coordinate in preview pixels.
     * @param {Number} y2 - Ending y-coordinate in preview pixels.
     * @returns {void}
     */
    function drawLine(graphics, pen, x1, y1, x2, y2) {
      var path = graphics.newPath();
      graphics.moveTo(x1, y1);
      graphics.lineTo(x2, y2);
      graphics.strokePath(pen, path);
    }

    /**
     * Draw a filled and stroked rectangle representing the preview paper.
     *
     * @param {ScriptUIGraphics} graphics - Preview graphics context.
     * @param {ScriptUIPen} pen - Pen used for the rectangle outline.
     * @param {ScriptUIBrush} brush - Brush used for the rectangle fill.
     * @param {Number} left - Left x-coordinate in preview pixels.
     * @param {Number} top - Top y-coordinate in preview pixels.
     * @param {Number} width - Rectangle width in preview pixels.
     * @param {Number} height - Rectangle height in preview pixels.
     * @returns {void}
     */
    function drawRectangle(graphics, pen, brush, left, top, width, height) {
      var path = graphics.newPath();
      graphics.rectPath(left, top, width, height);
      graphics.fillPath(brush, path);
      graphics.strokePath(pen, path);
    }

    /**
     * Draw an unfilled rectangular guide around the illustrated inset area.
     *
     * @param {ScriptUIGraphics} graphics - Preview graphics context.
     * @param {ScriptUIPen} pen - Pen used for the guide outline.
     * @param {Number} left - Left x-coordinate in preview pixels.
     * @param {Number} top - Top y-coordinate in preview pixels.
     * @param {Number} width - Outline width in preview pixels.
     * @param {Number} height - Outline height in preview pixels.
     * @returns {void}
     */
    function drawOutline(graphics, pen, left, top, width, height) {
      var path = graphics.newPath();
      graphics.rectPath(left, top, width, height);
      graphics.strokePath(pen, path);
    }

    /**
     * Draw a line with an arrowhead at its ending point.
     *
     * The arrowhead is formed from two short lines rotated 36 degrees from
     * the reverse direction of the main line. The helper is called twice by
     * `drawDimension()` to create a dimension line with arrows at both ends.
     *
     * @param {ScriptUIGraphics} graphics - Preview graphics context.
     * @param {ScriptUIPen} pen - Pen used for the line and arrowhead.
     * @param {Number} x1 - Starting x-coordinate in preview pixels.
     * @param {Number} y1 - Starting y-coordinate in preview pixels.
     * @param {Number} x2 - Ending x-coordinate in preview pixels.
     * @param {Number} y2 - Ending y-coordinate in preview pixels.
     * @param {Number} headSize - Length of each arrowhead side in pixels.
     * @returns {void}
     */
    function drawArrow(graphics, pen, x1, y1, x2, y2, headSize) {
      var angle = Math.atan2(y2 - y1, x2 - x1);
      var leftAngle = angle + Math.PI * 0.8;
      var rightAngle = angle - Math.PI * 0.8;
      drawLine(graphics, pen, x1, y1, x2, y2);
      drawLine(
        graphics,
        pen,
        x2,
        y2,
        x2 + Math.cos(leftAngle) * headSize,
        y2 + Math.sin(leftAngle) * headSize,
      );
      drawLine(
        graphics,
        pen,
        x2,
        y2,
        x2 + Math.cos(rightAngle) * headSize,
        y2 + Math.sin(rightAngle) * headSize,
      );
    }

    /**
     * Draw a two-ended dimension annotation and its label.
     *
     * @param {ScriptUIGraphics} graphics - Preview graphics context.
     * @param {ScriptUIPen} pen - Pen used for arrows and label text.
     * @param {Number} x1 - First dimension endpoint x-coordinate.
     * @param {Number} y1 - First dimension endpoint y-coordinate.
     * @param {Number} x2 - Second dimension endpoint x-coordinate.
     * @param {Number} y2 - Second dimension endpoint y-coordinate.
     * @param {String} label - Measurement label to render.
     * @param {Number} labelX - Label x-coordinate in preview pixels.
     * @param {Number} labelY - Label y-coordinate in preview pixels.
     * @returns {void}
     */
    function drawDimension(graphics, pen, x1, y1, x2, y2, label, labelX, labelY) {
      drawArrow(graphics, pen, x1, y1, x2, y2, 4);
      drawArrow(graphics, pen, x2, y2, x1, y1, 4);
      graphics.drawString(label, pen, labelX, labelY);
    }

    /**
     * Draw the L-shaped registration mark used in the schematic.
     *
     * The mark extends left and upward from its anchor. Its orientation is
     * intentionally fixed in the preview because the dialog preview focuses
     * on dimensions and placement rather than showing every corner rotation.
     *
     * @param {ScriptUIGraphics} graphics - Preview graphics context.
     * @param {ScriptUIPen} pen - Pen used to stroke the mark.
     * @param {Number} x - Mark anchor x-coordinate in preview pixels.
     * @param {Number} y - Mark anchor y-coordinate in preview pixels.
     * @param {Number} size - Length of each mark arm in preview pixels.
     * @returns {void}
     */
    function drawRotatedMark(graphics, pen, x, y, size) {
      drawLine(graphics, pen, x, y, x - size, y);
      drawLine(graphics, pen, x, y, x, y - size);
    }

    /**
     * Paint the complete preview whenever ScriptUI requests a redraw.
     *
    * The drawing is rebuilt from the current `data` object on every call, so
    * no stale graphics paths need to be retained between updates. Coordinates
    * are derived from the panel dimensions. The inset distance and rendered
    * stroke width are bounded for display, while the entered size is shown in
    * labels and does not control the schematic mark's fixed pixel size.
     *
     * @this {Panel}
     * @returns {void}
     */
    control.onDraw = function () {
      var graphics = this.graphics;
      var width = this.size.width;
      var height = this.size.height;
      var paperPen = graphics.newPen(
        graphics.PenType.SOLID_COLOR,
        [0.35, 0.35, 0.35, 1],
        1,
      );
      var guidePen = graphics.newPen(
        graphics.PenType.SOLID_COLOR,
        [0.55, 0.55, 0.55, 1],
        1,
      );
      var markPen = graphics.newPen(
        graphics.PenType.SOLID_COLOR,
        [0.05, 0.05, 0.05, 1],
        Math.max(1, Math.min(100, data.stroke * 0.75)),
      );
      var labelBrush = graphics.newBrush(
        graphics.BrushType.SOLID_COLOR,
        [0.29, 0.61, 0.83, 1],
      );
      var paperBrush = graphics.newBrush(
        graphics.BrushType.SOLID_COLOR,
        [0.94, 0.94, 0.94, 1],
      );
      var markSize = 64;
      var insetDistance = Math.max(0, Math.min(72, data.inset * 2.5));
      var direction = data.insetDirection == "Inset" ? 1 : -1;
      var saveSpaceX = data.saveSpaceHorizontal ? markSize : 0;
      var saveSpaceY = data.saveSpaceVertical ? markSize : 0;
      var markX = width / 2;
      var markY = height / 2;
      var cornerX = markX - direction * insetDistance - saveSpaceX;
      var cornerY = markY - direction * insetDistance - saveSpaceY;
      var left = cornerX;
      var top = cornerY;
      var paperSize = width * 2;
      var paperRight = left + paperSize;
      var paperBottom = top + paperSize;
      var dimensionPen = graphics.newPen(
        graphics.PenType.SOLID_COLOR,
        [0.29, 0.61, 0.83, 1],
        1,
      );

      drawRectangle(
        graphics,
        paperPen,
        paperBrush,
        left,
        top,
        paperRight - left,
        paperBottom - top,
      );
      drawLine(graphics, paperPen, left, top, paperRight, top);
      drawLine(graphics, paperPen, left, top, left, paperBottom);
      drawRotatedMark(graphics, markPen, markX, markY, markSize);

      var sizeDimensionY = markY - 22;
      drawLine(graphics, dimensionPen, markX, markY, markX, sizeDimensionY);
      drawLine(
        graphics,
        dimensionPen,
        markX - markSize,
        markY,
        markX - markSize,
        sizeDimensionY,
      );
      drawDimension(
        graphics,
        dimensionPen,
        markX,
        sizeDimensionY,
        markX - markSize,
        sizeDimensionY,
        "Size " + formatMeasurement(data.size),
        4,
        sizeDimensionY - 24,
      );
      drawLine(
        graphics,
        dimensionPen,
        68,
        sizeDimensionY - 8,
        markX - markSize / 2,
        sizeDimensionY,
      );

      var diagonalMidX = (cornerX + markX) / 2;
      var diagonalMidY = (cornerY + markY) / 2;
      var insetLabelX = diagonalMidX + 12;
      var insetLabelY = diagonalMidY + 14;
      if (data.insetDirection == "Outset") {
        drawOutline(
          graphics,
          dimensionPen,
          left - insetDistance,
          top - insetDistance,
          paperSize + insetDistance * 2,
          paperSize + insetDistance * 2,
        );
        graphics.drawString(
          "Outset " + formatMeasurement(data.inset),
          dimensionPen,
          left - insetDistance - 40 + insetDistance * 0.75,
          top - insetDistance - 16,
        );
      } else {
        drawOutline(
          graphics,
          dimensionPen,
          left + insetDistance,
          top + insetDistance,
          paperSize - insetDistance * 2,
          paperSize - insetDistance * 2,
        );
        graphics.drawString(
          "Inset " + formatMeasurement(data.inset),
          dimensionPen,
          left + insetDistance - 40 + insetDistance * 0.75,
          top + insetDistance - 16,
        );
      }

      var strokeAnchorX = markX;
      var strokeAnchorY = markY - markSize;
      var strokeX = strokeAnchorX + 10;
      var strokeY = strokeAnchorY - 4;
      drawLine(graphics, dimensionPen, strokeAnchorX, strokeAnchorY, strokeX, strokeY);
      graphics.drawString(
        "Stroke " + formatMeasurement(data.stroke, "pt"),
        dimensionPen,
        strokeX + 3,
        strokeY + 3,
      );

      graphics.drawString("Size: " + formatMeasurement(data.size), labelBrush, 12, height - 58);
      graphics.drawString(
        "Inset: " + formatMeasurement(data.inset) + "  " + data.insetDirection,
        labelBrush,
        112,
        height - 58,
      );
      graphics.drawString("Stroke: " + formatMeasurement(data.stroke), labelBrush, 12, height - 43);
      graphics.drawString("Ref: " + data.reference, labelBrush, 112, height - 43);
      graphics.drawString("Color: " + data.color, labelBrush, 12, height - 28);
      var saveSpaceLabel = "None";
      if (data.saveSpaceHorizontal && data.saveSpaceVertical) {
        saveSpaceLabel = "Horizontal + Vertical";
      } else if (data.saveSpaceHorizontal) {
        saveSpaceLabel = "Horizontal";
      } else if (data.saveSpaceVertical) {
        saveSpaceLabel = "Vertical";
      }
      graphics.drawString("Space: " + saveSpaceLabel, labelBrush, 112, height - 28);
    };

    /**
     * Format a point measurement for display in the preview.
     *
     * Illustrator's `UnitValue` performs the conversion so the preview can
     * display the document's selected unit while retaining point-based drawing
     * calculations. Invalid values are not handled here; callers provide the
     * validated numeric values gathered by `updatePreview()`.
     *
     * @param {Number} points - Measurement value expressed in points.
     * @param {String} [unit] - Target unit suffix. Defaults to the current
     * preview state's `unit` value.
     * @returns {String} Value rounded to two decimals followed by its unit.
     */
    function formatMeasurement(points, unit) {
      unit = unit || data.unit;
      var value = UnitValue(points, "pt");
      return value.as(unit).toFixed(2) + " " + unit;
    }

    return {
      control: control,
      /**
       * Merge new state into the preview and request a visual refresh.
       *
      * The update is intentionally shallow: callers provide only the fields
      * that changed, while unspecified fields retain their previous values.
      * Toggling visibility prompts ScriptUI to repaint the control, and the
      * parent layout is refreshed when the host exposes a layout manager. The
      * method does not validate or convert supplied values; callers are
      * responsible for providing preview-state values in the documented form.
       *
       * @param {Partial<RegistrationPreviewData>} nextData - Preview state
       * properties to replace.
       * @returns {void}
       */
      update: function (nextData) {
        for (var prop in nextData) data[prop] = nextData[prop];
        control.visible = false;
        control.visible = true;
        if (control.parent && control.parent.layout) {
          control.parent.layout.layout(true);
        }
      },
    };
  }

  /**
   * Show the script settings dialog and return the selected options.
   *
   * @returns {Object|Boolean} settings object if OK was clicked, or false if canceled.
   */
  function dialog() {
    var s = "[Default]";

    // helpers to prevent multiple events from firing when loading presets
    // var loading = false;
    var savingPreset = false;

    // dropdown options
    var arrSpotColors = [];
    for (var i = 0; i < spotColors.length; i++) {
      arrSpotColors.push(spotColors[i].name);
    }
    var arrPosition = ["Top", "Bottom"];
    var arrAlignment = ["Left", "Right"];

    var win = new Window("dialog");
    win.text = scriptTitle + " " + scriptVersion;
    win.orientation = "column";
    win.alignChildren = ["fill", "center"];
    win.margins = 16;

    // Panel - Reference Object
    var pReference = win.add("panel", undefined, "Reference Object");
    pReference.orientation = "row";
    pReference.alignChildren = ["center", "top"];
    pReference.margins = 18;
    var items = ["Artboard", "Selection"];
    var referenceObject = pReference.add("dropdownlist", undefined, items);
    if (doc.selection.length > 0) {
      referenceObject.items[1].enabled = true;
    } else {
      referenceObject.items[1].enabled = false;
    }

    // Panel - Placement
    var pPlacement = win.add("panel", undefined, "Placement");
    pPlacement.orientation = "column";
    pPlacement.alignChildren = ["fill", "center"];
    pPlacement.margins = 18;
    pPlacement.alignment = ["fill", "top"];

    var placementContent = pPlacement.add("group", undefined);
    placementContent.orientation = "row";
    placementContent.alignChildren = ["fill", "center"];
    placementContent.alignment = ["fill", "center"];

    function addMarkTextField(group, justify) {
      var textControl = group.add(
        'edittext {justify: "' + justify + '"}',
        undefined,
        "",
      );
      textControl.preferredSize.width = 180;
      textControl.alignment = ["fill", "center"];
      return textControl;
    }

    function addTextColumnRow(column, arrow, textFirst) {
      var row = column.add("group", undefined);
      row.orientation = "row";
      row.spacing = textFirst ? 8 : 0;
      row.alignChildren = ["fill", "center"];
      row.alignment = ["fill", "center"];
      var textControl;
      if (textFirst) {
        textControl = addMarkTextField(row, "right");
        row.add("statictext", undefined, arrow);
      } else {
        row.add("statictext", undefined, arrow);
        textControl = addMarkTextField(row, "left");
      }
      return textControl;
    }

    var leftTextColumn = placementContent.add("group", undefined);
    leftTextColumn.orientation = "column";
    leftTextColumn.alignChildren = ["fill", "center"];
    leftTextColumn.alignment = ["fill", "center"];
    leftTextColumn.preferredSize.width = 200;
    var tlText = addTextColumnRow(leftTextColumn, "\u2192", true);
    leftTextColumn.add("group", undefined).preferredSize.height = 20;
    var blText = addTextColumnRow(leftTextColumn, "\u2192", true);

    // Checkbox grid
    var checkboxGrid = placementContent.add("group", undefined);
    checkboxGrid.orientation = "column";
    checkboxGrid.alignChildren = ["center", "center"];
    checkboxGrid.alignment = ["center", "center"];

    var gTop = checkboxGrid.add("group", undefined);
    gTop.orientation = "row";
    var tl = gTop.add("checkbox", undefined);
    var tc = gTop.add("checkbox", undefined);
    var tr = gTop.add("checkbox", undefined);

    var gCenter = checkboxGrid.add("group", undefined);
    gCenter.orientation = "row";
    var cl = gCenter.add("checkbox", undefined);
    var cc = gCenter.add("checkbox", undefined);
    cc.enabled = false;
    var cr = gCenter.add("checkbox", undefined);

    var gBottom = checkboxGrid.add("group", undefined);
    gBottom.orientation = "row";
    var bl = gBottom.add("checkbox", undefined);
    var bc = gBottom.add("checkbox", undefined);
    var br = gBottom.add("checkbox", undefined);

    var rightTextColumn = placementContent.add("group", undefined);
    rightTextColumn.orientation = "column";
    rightTextColumn.alignChildren = ["fill", "center"];
    rightTextColumn.alignment = ["fill", "center"];
    rightTextColumn.preferredSize.width = 200;
    var trText = addTextColumnRow(rightTextColumn, "\u2190", false);
    rightTextColumn.add("group", undefined).preferredSize.height = 20;
    var brText = addTextColumnRow(rightTextColumn, "\u2190", false);

    // Group - Specs and Preview
    var gSpecsPreview = win.add("group", undefined);
    gSpecsPreview.orientation = "row";
    gSpecsPreview.alignChildren = ["fill", "top"];
    gSpecsPreview.alignment = ["fill", "top"];

    // Panel - Specs
    var pSpecs = gSpecsPreview.add("panel", undefined, "Specs");
    pSpecs.orientation = "column";
    pSpecs.alignChildren = ["left", "top"];
    pSpecs.margins = 18;
    pSpecs.spacing = 6;
    pSpecs.alignment = ["left", "top"];

    // Panel - Preview
    var pPreview = gSpecsPreview.add("panel", undefined, "Preview");
    pPreview.orientation = "column";
    pPreview.alignChildren = ["fill", "top"];
    pPreview.margins = 10;
    pPreview.alignment = ["fill", "top"];

    var preview = createRegistrationPreview(pPreview);

    function matchSpecsHeightToPreview() {
      var previewHeight = pPreview.size.height;
      pSpecs.minimumSize.height = previewHeight;
      pSpecs.preferredSize.height = previewHeight;
      pSpecs.maximumSize.height = previewHeight;
      win.layout.layout(true);
    }

    function getPreviewValue(text, fallback, defaultUnit) {
      var value;
      try {
        value = UnitValue(text);
        if (value.type == "?") value = UnitValue(text, defaultUnit);
        value = value.as("pt");
        if (isNaN(value) || value < 0) value = fallback;
      } catch (e) {
        value = fallback;
      }
      return value;
    }

    function updatePreview() {
      var rulerUnits = doc.rulerUnits.toString().split(".")[1].toLowerCase();
      var referenceText =
        referenceObject.selection && referenceObject.selection.text
          ? referenceObject.selection.text
          : "Artboard";
      preview.update({
        size: getPreviewValue(size.text, 0, "in"),
        stroke: getPreviewValue(stroke.text, 0, "pt"),
        inset: getPreviewValue(inset.text, 0, "in"),
        insetDirection: invertinset.value ? "Outset" : "Inset",
        color:
          color.selection && color.selection.text
            ? color.selection.text
            : "[Registration]",
        reference: referenceText,
        referenceIndex:
          referenceObject.selection && referenceObject.selection.index == 1
            ? 1
            : 0,
        saveSpaceHorizontal: saveSpaceHorizontal.value,
        saveSpaceVertical: saveSpaceVertical.value,
        unit: rulerUnits,
      });
    }

    // Group - Size
    var gSize = pSpecs.add("group", undefined, { name: "gSize" });
    gSize.orientation = "row";
    gSize.alignChildren = ["left", "center"];
    gSize.alignment = ["fill", "fill"];

    var stSize = gSize.add("statictext", undefined, "Size:", {
      name: "stSize",
    });
    stSize.justify = "right";
    stSize.preferredSize.width = 60;

    var size = gSize.add(
      'edittext {justify: "center", properties: {name: "size"}}',
    );
    size.text = "";
    size.preferredSize.width = 100;

    // Group - Stroke
    var gStroke = pSpecs.add("group", undefined, { name: "gStroke" });
    gStroke.orientation = "row";
    gStroke.alignChildren = ["left", "center"];
    gStroke.alignment = ["fill", "center"];

    var stStroke = gStroke.add("statictext", undefined, "Stroke:", {
      name: "stStroke",
    });
    stStroke.justify = "right";
    stStroke.preferredSize.width = 60;

    var stroke = gStroke.add(
      'edittext {justify: "center", properties: {name: "stroke"}}',
    );
    stroke.text = "";
    stroke.preferredSize.width = 100;

    // Group - Inset
    var gInset = pSpecs.add("group", undefined, { name: "gInset" });
    gInset.orientation = "row";
    gInset.alignChildren = ["left", "center"];
    gInset.alignment = ["fill", "center"];

    var stInset = gInset.add("statictext", undefined, "Inset:", {
      name: "stInset",
    });
    stInset.justify = "right";
    stInset.preferredSize.width = 60;
    //add option to negate inset
    var invertinset = gInset.add("checkbox", undefined, "Invert Inset");

    var inset = gInset.add(
      'edittext {justify: "center", properties: {name: "inset"}}',
    );
    inset.text = "";
    inset.preferredSize.width = 100;

    // Group - Save Space
    var gSaveSpace = pSpecs.add("group", undefined);
    gSaveSpace.orientation = "row";
    gSaveSpace.alignChildren = ["left", "center"];
    gSaveSpace.alignment = ["fill", "center"];
    var saveSpaceHorizontal = gSaveSpace.add(
      "checkbox",
      undefined,
      "Save Space Horizontal",
    );
    var saveSpaceVertical = gSaveSpace.add(
      "checkbox",
      undefined,
      "Save Space Vertical",
    );
    saveSpaceHorizontal.enabled = false;
    saveSpaceVertical.enabled = false;

    function updateSaveSpaceEnabled() {
      var enabled = !!invertinset.value;
      saveSpaceHorizontal.enabled = enabled;
      saveSpaceVertical.enabled = enabled;
    }

    // Group - Color
    var gColor = pSpecs.add("group", undefined);
    gColor.orientation = "row";
    gColor.alignChildren = ["left", "center"];
    gColor.alignment = ["fill", "center"];

    var stColor = gColor.add("statictext", undefined, "Color:", {
      name: "stColor",
    });
    stColor.justify = "right";
    stColor.preferredSize.width = 60;

    var color = gColor.add("dropdownlist", undefined, undefined, {
      name: "color",
      items: arrSpotColors,
    });
    // color.preferredSize.width = 100;

    // Panel - Output
    var pOutput = win.add("panel", undefined, "Output Information");
    pOutput.orientation = "column";
    pOutput.alignChildren = ["fill", "top"];
    pOutput.margins = 18;

    // Group - Output Options
    var gOutputOptions = pOutput.add("group", undefined);
    gOutputOptions.orientation = "row";
    gOutputOptions.alignChildren = ["left", "center"];

    // added option for a blank textbox
    var blanktextbox = gOutputOptions.add("checkbox", undefined, "Add Blank Textbox");
    var spots = gOutputOptions.add("checkbox", undefined, "Spot Colors");
    
    var file = gOutputOptions.add("checkbox", undefined, "File Info");
    var timestamp = gOutputOptions.add("checkbox", undefined, "Timestamp");

    // Group - Output position
    var gOutputPosition = pOutput.add("group", undefined);

    // Group - Position
    var gPosition = gOutputPosition.add("group", undefined);
    gPosition.add("statictext", undefined, "Position:");
    var position = gPosition.add("dropdownlist", undefined, arrPosition);
    position.preferredSize.width = 100;

    // Group - Alignment
    var gAlignment = gOutputPosition.add("group", undefined);
    gAlignment.add("statictext", undefined, "Alignment:");
    var alignment = gAlignment.add("dropdownlist", undefined, arrAlignment);
    alignment.preferredSize.width = 100;

    // Panel - Presets
    var pPresets = win.add("panel", undefined, "Presets", { name: "pPresets" });
    pPresets.orientation = "row";
    pPresets.alignChildren = ["left", "center"];
    pPresets.margins = 18;
    pPresets.alignment = ["fill", "center"];

    // Group - Preset
    var gPreset = pPresets.add("group", undefined, { name: "gPreset" });
    gPreset.orientation = "row";
    gPreset.alignChildren = ["left", "center"];
    gPreset.alignment = ["fill", "center"];

    gPreset.add("statictext", undefined, "Load:", { name: "stLoad" });

    var preset = gPreset.add("dropdownlist", undefined, undefined, {
      name: "preset",
      items: undefined,
    });
    var presets = loadPresetsDropdown();
    preset.alignment = ["fill", "center"];
    preset.selection = 0;

    // Group - Preset Buttons
    var gPresetButtons = pPresets.add("group", undefined, {
      name: "gPresetButtons",
    });
    gPresetButtons.orientation = "row";
    gPresetButtons.alignChildren = ["left", "center"];
    gPresetButtons.alignment = ["right", "center"];

    var btDelete = gPresetButtons.add("button", undefined, "Delete", {
      name: "btDelete",
    });
    btDelete.preferredSize.width = 80;
    btDelete.enabled = false;

    var btSave = gPresetButtons.add("button", undefined, "Save", {
      name: "btSave",
    });
    btSave.preferredSize.width = 80;

    // Group - Buttons
    var gButtons = win.add("group", undefined, { name: "gButtons" });
    gButtons.orientation = "row";
    gButtons.alignChildren = ["center", "center"];
    gButtons.margins = 10;

    var btViewFiles = gButtons.add("button", undefined, "View Files", {
      name: "btViewFiles",
    });
    btViewFiles.preferredSize.width = 100;

    var btOK = gButtons.add("button", undefined, "OK", { name: "btOK" });
    btOK.preferredSize.width = 100;

    var btCancel = gButtons.add("button", undefined, "Cancel", {
      name: "btCancel",
    });
    btCancel.preferredSize.width = 100;

    // Copyright
    var stCopyright = win.add(
      "statictext",
      undefined,
      scriptCopyright + " @ " + website,
      {
        name: "stCopyright",
      },
    );
    stCopyright.justify = "center";

    /////////////////////////////
    // HELPER FUNCTIONS //
    /////////////////////////////

    /**
     * Load preset values into the dialog controls.
     *
     * @param {String} k - Preset key name to load.
     */
    function loadPreset(k) {
      // no need to load after saving a preset
      if (savingPreset) return;

      // loading = true;

      k = Object.prototype.hasOwnProperty.call(prefs.data, k) ? k : "[Default]";

      logger.log("loading preset:", k);

      var s = prefs.data[k];
      for (var prop in s) {
        logger.log(prop + ":", s[prop]);
      }

      // check position boxes
      tl.value = s.tl;
      tc.value = s.tc;
      tr.value = s.tr;
      cl.value = s.cl;
      cc.value = s.cc;
      cr.value = s.cr;
      bl.value = s.bl;
      bc.value = s.bc;
      br.value = s.br;

      // convert size, inset units to match the document ruler units
      var sizeUnitValue = parseNumberInput(s.size);
      sizeUnitValue.value = sizeUnitValue.value.toFixed(4);
      size.text = sizeUnitValue;

      var insetUnitValue = parseNumberInput(s.inset);
      insetUnitValue.value = insetUnitValue.value.toFixed(4);
      inset.text = insetUnitValue;
      invertinset.value = s.invertinset;
      updateSaveSpaceEnabled();
      saveSpaceHorizontal.value = !!s.saveSpaceHorizontal;
      saveSpaceVertical.value = !!s.saveSpaceVertical;
      if (saveSpaceHorizontal.value && saveSpaceVertical.value) {
        saveSpaceVertical.value = false;
      }

      var strokeUnitValue = parseNumberInput(s.stroke);
      stroke.text = strokeUnitValue;

      // set output information
      tlText.text = typeof s.tlText == "string" ? s.tlText : defaults["[Default]"].tlText;
      trText.text = typeof s.trText == "string" ? s.trText : defaults["[Default]"].trText;
      blText.text = typeof s.blText == "string" ? s.blText : defaults["[Default]"].blText;
      brText.text = typeof s.brText == "string" ? s.brText : defaults["[Default]"].brText;
      spots.value = s.spots;
      file.value = s.file;
      timestamp.value = s.timestamp;

      // set dropdowns
      color.selection = color.find(s.color);
      if (color.selection == null) {
        alert(
          "Spot Color Not Found\n" +
            s.color +
            " not found. Defaulting to [Registration].",
        );
        color.selection = color.find("[Registration]");
      }
      position.selection = position.find(s.position);
      alignment.selection = alignment.find(s.alignment);

      // set the preset dropdown
      preset.selection = preset.find(k);
      referenceObject.selection =
        s.referenceObject == 1 && referenceObject.items[1].enabled ? 1 : 0;

      updatePreview();

      // loading = false;
    }

    /**
     * Populate the preset dropdown with built-in and saved presets.
     *
     * @returns {Array} Sorted preset names for the dropdown.
     */
    function loadPresetsDropdown() {
      preset.removeAll();

      // setup built-in presets
      var presets = ["[Default]"];
      if (Object.prototype.hasOwnProperty.call(prefs.data, "[Last Used]"))
        presets.push("[Last Used]");

      // load presets from prefs
      var userPresets = [];
      for (var prop in prefs.data) {
        if (prop === "[Default]" || prop === "[Last Used]") continue;
        userPresets.push(prop);
      }
      userPresets.sort();

      // combine built-in and user presets
      presets = presets.concat(userPresets);

      for (var i = 0; i < presets.length; i++) {
        preset.add("item", presets[i]);
      }

      return presets;
    }

    /**
     * Read current dialog values and format them for saving or execution.
     *
     * @returns {Settings} The current dialog settings object.
     */
    function getCurrentDialogSettings() {
      // Return only primitive, serializable values (no host/UI objects)
      return {
        tl: !!tl.value,
        tc: !!tc.value,
        tr: !!tr.value,
        cl: !!cl.value,
        cc: !!cc.value,
        cr: !!cr.value,
        bl: !!bl.value,
        bc: !!bc.value,
        br: !!br.value,
        tlText: tlText.text,
        trText: trText.text,
        blText: blText.text,
        brText: brText.text,
        size: UnitValue(size.text).toString(),
        stroke: UnitValue(stroke.text).toString(),
        inset: UnitValue(inset.text).toString(),
        invertinset: !!invertinset.value,
        saveSpaceHorizontal: !!saveSpaceHorizontal.value,
        saveSpaceVertical: !!saveSpaceVertical.value,
        color:
          color.selection && color.selection.text
            ? color.selection.text
            : "[Registration]",
        blanktextbox: !!blanktextbox.value,
        spots: !!spots.value,
        file: !!file.value,
        timestamp: !!timestamp.value,
        position:
          position.selection && position.selection.text
            ? position.selection.text
            : "Top",
        alignment:
          alignment.selection && alignment.selection.text
            ? alignment.selection.text
            : "Left",
        referenceObject:
          referenceObject.selection != null
            ? referenceObject.selection.index
            : 0,
      };
    }

    ////////////////////////////////////////////////////
    // INPUT HELPERS, VALIDATORS, AND EVENT LISTENERS //
    ////////////////////////////////////////////////////

    // load initial presets
    win.onShow = function () {
      loadPreset(s);
      matchSpecsHeightToPreview();
    };

    size.onChange = function () {
      logger.log("validating:", "size", "(" + size.text + ")");
      var n = parseNumberInput(size.text, defaults["[Default]"].size);

      // trim value
      n.value = n.value.toFixed(4);

      // limit downside
      if (n.value < 0) n.value = 0;

      size.text = n;

      preset.selection = null;
      btDelete.enabled = false;
      updatePreview();
    };

    stroke.onChange = function () {
      logger.log("validating:", "stroke", "(" + stroke.text + ")");
      var n = parseNumberInput(stroke.text, defaults["[Default]"].stroke, "pt");

      // trim value
      n.value = n.value.toFixed(4);

      // limit downside
      if (n.value < 0) n.value = 0;

      stroke.text = n;

      preset.selection = null;
      btDelete.enabled = false;
      updatePreview();
    };

    inset.onChange = function () {
      logger.log("validating:", "inset", "(" + inset.text + ")");
      var n = parseNumberInput(inset.text, defaults["[Default]"].inset);

      // trim value
      n.value = n.value.toFixed(4);

      // limit downside
      if (n.value < 0) n.value = 0;

      inset.text = n;

      preset.selection = null;
      btDelete.enabled = false;
      updatePreview();
    };

    color.onChange = function () {
      preset.selection = null;
      btDelete.enabled = false;
      updatePreview();
    };

    invertinset.onClick = function () {
      updateSaveSpaceEnabled();
      preset.selection = null;
      btDelete.enabled = false;
      updatePreview();
    };

    referenceObject.onChange = function () {
      preset.selection = null;
      btDelete.enabled = false;
      updatePreview();
    };

    position.onChange = function () {
      preset.selection = null;
      btDelete.enabled = false;
    };

    alignment.onChange = function () {
      preset.selection = null;
      btDelete.enabled = false;
    };

    // load new setting check a saved setting is picked from the dropdown
    preset.onChange = function () {
      // don't update if the selection is null and disable preset delete button
      if (this.selection == null) {
        btDelete.enabled = false;
      } else {
        // don't allow deleting of default presets
        if (
          this.selection.text == "[Default]" ||
          this.selection.text == "[Last Used]"
        ) {
          btDelete.enabled = false;
        } else {
          // enable delete for any user saved presets
          btDelete.enabled = true;
        }
        logger.log(
          "changed:",
          this.properties.name,
          "(" + this.selection.text + ")",
        );
        loadPreset(this.selection.text);
      }
    };

    // delete selected preset
    btDelete.onClick = function () {
      if (
        Window.confirm(
          "Delete preset?\n" + preset.selection.text,
          "noAsDflt",
          "Delete Preset",
        )
      ) {
        delete prefs.data[preset.selection.text];
        prefs.save();
        presets;
        presets.splice(preset.selection.index);
        preset.remove(preset.selection.index);
      }
    };

    // save new preset
    btSave.onClick = function () {
      var saveName = savePresetDialog(presets);

      if (!saveName) {
        return;
      }

      // since `dropdownlist.find()` send an onChange event, halt reloading the same preset
      savingPreset = true;

      prefs.data[saveName] = getCurrentDialogSettings();
      prefs.save();
      // reload preset dropdown
      presets = loadPresetsDropdown();
      // reset selection setting to new preset
      preset.selection = preset.find(saveName);

      savingPreset = false;
    };

    btViewFiles.onClick = function () {
      var logPath = logger.file ? logger.file.fsName : "(no log path set)";
      var prefsPath = prefs.file ? prefs.file.fsName : "(no prefs path set)";

      var viewWin = new Window("dialog");
      viewWin.text = "Open Log / Prefs";
      viewWin.orientation = "column";
      viewWin.alignChildren = ["fill", "top"];
      viewWin.margins = 16;
      viewWin.spacing = 10;

      viewWin.add("statictext", undefined, "Log file:");
      viewWin.add("statictext", undefined, logPath);
      viewWin.add("statictext", undefined, "");
      viewWin.add("statictext", undefined, "Prefs file:");
      viewWin.add("statictext", undefined, prefsPath);

      var buttonGroup = viewWin.add("group", undefined);
      buttonGroup.orientation = "row";
      buttonGroup.alignChildren = ["center", "center"];
      buttonGroup.spacing = 10;

      var openLog = buttonGroup.add("button", undefined, "Open Log");
      var openPrefs = buttonGroup.add("button", undefined, "Open Prefs");
      var closeButton = buttonGroup.add("button", undefined, "Close");

      openLog.onClick = function () {
        if (typeof logger.open === "function") {
          logger.open();
        } else if (logger.file) {
          logger.file.execute();
        } else {
          alert("Log file is not available.");
        }
      };
      openPrefs.onClick = function () {
        if (typeof prefs.reveal === "function") {
          prefs.reveal();
        } else if (prefs.file) {
          prefs.file.parent.execute();
        } else {
          alert("Prefs file is not available.");
        }
      };
      closeButton.onClick = function () {
        viewWin.close();
      };

      viewWin.show();
    };

    stCopyright.addEventListener("click", function (e) {
      if (dev && e.ctrlKey) {
        var actions = {
          "Open Log": function () {
            logger.open();
          },
          "Reveal Prefs": function () {
            prefs.reveal();
          },
        };

        var win = new Window("dialog");
        win.text = "Dev Menu";
        win.orientation = "column";
        win.alignChildren = ["center", "center"];
        win.spacing = 10;
        win.margins = 16;

        var b;
        for (var prop in actions) {
          b = win.add("button", undefined, prop, { name: "prop" });
          b.onClick = actions[prop];
        }

        win.show();
      } else {
        openURL("https://joshbduncan.com");
      }
    });

    var onClickResets = [
      tl,
      tc,
      tr,
      cl,
      cc,
      cr,
      bl,
      bc,
      br,
      spots,
      file,
      timestamp,
      tlText,
      trText,
      blText,
      brText,
    ];
    for (var z = 0; z < onClickResets.length; z++) {
      onClickResets[z].onClick = function () {
        preset.selection = null;
        btDelete.enabled = false;
        updatePreview();
      };
    }

    saveSpaceHorizontal.onClick = function () {
      if (saveSpaceHorizontal.value) saveSpaceVertical.value = false;
      preset.selection = null;
      btDelete.enabled = false;
      updatePreview();
    };

    saveSpaceVertical.onClick = function () {
      if (saveSpaceVertical.value) saveSpaceHorizontal.value = false;
      preset.selection = null;
      btDelete.enabled = false;
      updatePreview();
    };

    // if "ok" button clicked then return inputs
    if (win.show() == 1) {
      var currentSettings = getCurrentDialogSettings();
      prefs.data["[Last Used]"] = currentSettings;
      prefs.save();
      return currentSettings;
    }
  }
})();
