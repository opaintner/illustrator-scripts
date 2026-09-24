  ////////////////////////
  // MAIN SCRIPT DIALOG //
  ////////////////////////
  import * as livePreview from "./preview.js"
  import * as utils from "../utils/sharedUtils.js"
 import { defaults } from "./defaults.js";
  var doc = app.activeDocument
  var spotColors = doc.spots;
  
  
  
  /**
   * Show the script settings dialog and return the selected options.
   *
   * @returns {Object|Boolean} settings object if OK was clicked, or false if canceled.
   */
  

export function mainDialog(dev, scriptInfo, prefs, logger) {
    
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
    win.text = scriptInfo.title + " " + scriptInfo.version;
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
        ""
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

    var preview = livePreview.createRegistrationPreview(pPreview);

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
        unit: rulerUnits
      });
    }

    // Group - Size
    var gSize = pSpecs.add("group", undefined, { name: "gSize" });
    gSize.orientation = "row";
    gSize.alignChildren = ["left", "center"];
    gSize.alignment = ["fill", "fill"];

    var stSize = gSize.add("statictext", undefined, "Size:", {
      name: "stSize"
    });
    stSize.justify = "right";
    stSize.preferredSize.width = 60;

    var size = gSize.add(
      'edittext {justify: "center", properties: {name: "size"}}');
    size.text = "";
    size.preferredSize.width = 100;

    // Group - Stroke
    var gStroke = pSpecs.add("group", undefined, { name: "gStroke" });
    gStroke.orientation = "row";
    gStroke.alignChildren = ["left", "center"];
    gStroke.alignment = ["fill", "center"];

    var stStroke = gStroke.add("statictext", undefined, "Stroke:", {
      name: "stStroke"
    });
    stStroke.justify = "right";
    stStroke.preferredSize.width = 60;

    var stroke = gStroke.add(
      'edittext {justify: "center", properties: {name: "stroke"}}');
    stroke.text = "";
    stroke.preferredSize.width = 100;

    // Group - Inset
    var gInset = pSpecs.add("group", undefined, { name: "gInset" });
    gInset.orientation = "row";
    gInset.alignChildren = ["left", "center"];
    gInset.alignment = ["fill", "center"];

    var stInset = gInset.add("statictext", undefined, "Inset:", {
      name: "stInset"
    });
    stInset.justify = "right";
    stInset.preferredSize.width = 60;
    //add option to negate inset
    var invertinset = gInset.add("checkbox", undefined, "Invert Inset");

    var inset = gInset.add(
      'edittext {justify: "center", properties: {name: "inset"}}');
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
      "Save Space Horizontal");
    var saveSpaceVertical = gSaveSpace.add(
      "checkbox",
      undefined,
      "Save Space Vertical");
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
      name: "stColor"
    });
    stColor.justify = "right";
    stColor.preferredSize.width = 60;

    var color = gColor.add("dropdownlist", undefined, undefined, {
      name: "color",
      items: arrSpotColors
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
      items: undefined
    });
    var presets = loadPresetsDropdown();
    preset.alignment = ["fill", "center"];
    preset.selection = 0;

    // Group - Preset Buttons
    var gPresetButtons = pPresets.add("group", undefined, {
      name: "gPresetButtons"
    });
    gPresetButtons.orientation = "row";
    gPresetButtons.alignChildren = ["left", "center"];
    gPresetButtons.alignment = ["right", "center"];

    var btDelete = gPresetButtons.add("button", undefined, "Delete", {
      name: "btDelete"
    });
    btDelete.preferredSize.width = 80;
    btDelete.enabled = false;

    var btSave = gPresetButtons.add("button", undefined, "Save", {
      name: "btSave"
    });
    btSave.preferredSize.width = 80;

    // Group - Buttons
    var gButtons = win.add("group", undefined, { name: "gButtons" });
    gButtons.orientation = "row";
    gButtons.alignChildren = ["center", "center"];
    gButtons.margins = 10;

    var btViewFiles = gButtons.add("button", undefined, "View Files", {
      name: "btViewFiles"
    });
    btViewFiles.preferredSize.width = 100;

    var btOK = gButtons.add("button", undefined, "OK", { name: "btOK" });
    btOK.preferredSize.width = 100;

    var btCancel = gButtons.add("button", undefined, "Cancel", {
      name: "btCancel"
    });
    btCancel.preferredSize.width = 100;

    // Copyright
    var stCopyright = win.add(
      "statictext",
      undefined,
      scriptInfo.copyright + " @ " + scriptInfo.website,
      {
        name: "stCopyright"
      }
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
      var sizeUnitValue = utils.parseNumberInput(s.size);
      sizeUnitValue.value = sizeUnitValue.value.toFixed(4);
      size.text = sizeUnitValue;

      var insetUnitValue = utils.parseNumberInput(s.inset);
      insetUnitValue.value = insetUnitValue.value.toFixed(4);
      inset.text = insetUnitValue;
      invertinset.value = s.invertinset;
      updateSaveSpaceEnabled();
      saveSpaceHorizontal.value = !!s.saveSpaceHorizontal;
      saveSpaceVertical.value = !!s.saveSpaceVertical;
      if (saveSpaceHorizontal.value && saveSpaceVertical.value) {
        saveSpaceVertical.value = false;
      }

      var strokeUnitValue = utils.parseNumberInput(s.stroke);
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
          " not found. Defaulting to [Registration].");
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
            : 0
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
      var n = utils.parseNumberInput(size.text, defaults["[Default]"].size);

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
      var n = utils.parseNumberInput(stroke.text, defaults["[Default]"].stroke, "pt");

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
      var n = utils.parseNumberInput(inset.text, defaults["[Default]"].inset);

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
          "(" + this.selection.text + ")");
        loadPreset(this.selection.text);
      }
    };

    // delete selected preset
    btDelete.onClick = function () {
      if (
        Window.confirm(
          "Delete preset?\n" + preset.selection.text,
          "noAsDflt",
          "Delete Preset"
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
          }
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
        utils.openURL("https://joshbduncan.com");
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
      brText
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



/**
   * Dialog for saving/overwriting presets.
   * @param {Array} currentOptions Current presets (can be overwritten).
   * @returns {String|Boolean} Preset name on OK, false on Cancel.
   */
  export function savePresetDialog(currentOptions) {
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
            "No name provided!\nMake sure to provide a save name or pick a current present to replace."
          );
          return;
        }

        // check to see if preset already exist
        for (var i = 0; i < currentOptions.length; i++) {
          if (saveName == currentOptions[i]) {
            alert(
              "Preset Already Exist\nPreset '" +
              saveName +
              "' has already been saved. To overwrite your currently saved settings, use the 'Replace Settings' method."
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