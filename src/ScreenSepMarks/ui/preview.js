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
  export function createRegistrationPreview(parent) {
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
      unit: "pt"
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
        y2 + Math.sin(leftAngle) * headSize
      );
      drawLine(
        graphics,
        pen,
        x2,
        y2,
        x2 + Math.cos(rightAngle) * headSize,
        y2 + Math.sin(rightAngle) * headSize
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
        1
      );
      var guidePen = graphics.newPen(
        graphics.PenType.SOLID_COLOR,
        [0.55, 0.55, 0.55, 1],
        1
      );
      var markPen = graphics.newPen(
        graphics.PenType.SOLID_COLOR,
        [0.05, 0.05, 0.05, 1],
        Math.max(1, Math.min(100, data.stroke * 0.75))
      );
      var labelBrush = graphics.newPen(
        graphics.BrushType.SOLID_COLOR,
        [0.29, 0.61, 0.83, 1],
        1
      );
      var paperBrush = graphics.newBrush(
        graphics.BrushType.SOLID_COLOR,
        [0.94, 0.94, 0.94, 1]
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
        1
      );

      drawRectangle(
        graphics,
        paperPen,
        paperBrush,
        left,
        top,
        paperRight - left,
        paperBottom - top
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
        sizeDimensionY
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
        sizeDimensionY - 24
      );
      drawLine(
        graphics,
        dimensionPen,
        68,
        sizeDimensionY - 8,
        markX - markSize / 2,
        sizeDimensionY
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
          paperSize + insetDistance * 2
        );
        graphics.drawString(
          "Outset " + formatMeasurement(data.inset),
          dimensionPen,
          left - insetDistance - 40 + insetDistance * 0.75,
          top - insetDistance - 16
        );
      } else {
        drawOutline(
          graphics,
          dimensionPen,
          left + insetDistance,
          top + insetDistance,
          paperSize - insetDistance * 2,
          paperSize - insetDistance * 2
        );
        graphics.drawString(
          "Inset " + formatMeasurement(data.inset),
          dimensionPen,
          left + insetDistance - 40 + insetDistance * 0.75,
          top + insetDistance - 16
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
        strokeY + 3
      );

      graphics.drawString("Size: " + formatMeasurement(data.size), labelBrush, 12, height - 58);
      graphics.drawString(
        "Inset: " + formatMeasurement(data.inset) + "  " + data.insetDirection,
        labelBrush,
        112,
        height - 58
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
      }
    };
  }

