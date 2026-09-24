//////////////////////////////
// SCRIPT DRAWING FUNCTIONS //
//////////////////////////////
var doc = app.activeDocument;
var swatches = doc.swatches;
var spotColors = doc.spots;
/**
 * Find or create a work layer for the script and clear its contents if necessary.
 *
 * @param {String} name - Name of the layer to use or create.
 * @returns {Layer} The work layer for drawing marks and text.
 */
export function createWorkLayer(name, logger) {
var document = app.activeDocument;
    var layer = null;

    try {
      layer = document.layers.getByName(name);
    } catch (_e) {
      // Illustrator throws 1302 when the layer does not exist.
      layer = null;
    }

    if (layer === null || layer === undefined) {
      layer = document.layers.add();
      layer.name = name;

      logger.log("Created work layer: " + name);
      return layer;
    }

    logger.log(
      "Previous work layer found; removing all page items and unlocking layer"
    );

    layer.locked = false;
    layer.pageItems.removeAll();

    return layer;
}

/**
 * Return a spot swatch by name, falling back to [Registration] if missing.
 *
 * @param {String} name - Spot swatch name to look up.
 * @returns {Spot} The requested spot swatch or the registration swatch.
 */
function getSpotColor(name, logger) {
    var color;
    try {
        color = spotColors.getByName(name);
    } catch (e) {
        $.writeln(e.message);
        logger.log(
        "spot color swatch '" +
        name +
        "' not found, defaulting to [Registration]");
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
export function drawMarks(layer, settings, logger) {
    var doc = app.activeDocument;
    // convert provided inputs to points
    var size = UnitValue(settings.size).as("pt");
    var stroke = UnitValue(settings.stroke).as("pt");
    var inset = UnitValue(settings.inset).as("pt");
    // make sure spot color is available
    var color = new SpotColor();
    color.spot = getSpotColor(settings.color, logger);

    //invert inset value, if applicable
    if (settings.invertinset) {
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
        br: { x: right + size / 2 - horizontalOffset, y: bottom + size / 2 - verticalOffset }
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
        var top = selBounds[1] * -1;
        var bottom = selBounds[3] * -1;
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
            br: { x: right - inset - horizontalOffset, y: bottom - inset - verticalOffset }
        };
    }

    for (var prop in marks) {
        if (!settings[prop]) continue;
        logger.log(
        "drawing mark",
        prop,
        "at (" + marks[prop].x + ", " + marks[prop].y + ")");

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
        [x + size, -y]
        ]);
        xLine.strokeColor = color;
        xLine.stroked = true;
        xLine.strokeWidth = strokeWeight;
        xLine.filled = false;
        var yLine = regGroup.pathItems.add();
        yLine.setEntirePath([
        [x, -y],
        [x, -y - size]
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
        [x, -y - size]
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
export function writeInfo(layer, settings) {
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
    function setTextFrameVerticalJustificationToCenter() {
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
         * @returns {void} Removes the temporary action file after execution.
         */
        function runEmbeddedAction(data, action, setName) {
            

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
            catch (error) {
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
        runEmbeddedAction(embeddedActionData, actionName, actionSetName);
    } 
}
