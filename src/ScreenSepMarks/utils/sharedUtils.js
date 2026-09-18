  /**
   * Open a url in the system browser.
   * @param {String} url URL to open.
   */
  export function openURL(url) {
    var html = new File(Folder.temp.absoluteURI + "/aisLink.html");
    html.open("w");
    var htmlBody =
      '<html><head><META HTTP-EQUIV=Refresh CONTENT="0; URL=' +
      url +
      '"></head><body><p></p></body></html>';
    html.write(htmlBody);
    html.close();
    html.execute();
  };

  /**
   * Parse a ScriptUI `edittext` value into a valid `UnitType` number.
   * @param {Number|String} n - Value to parse.
   * @param {Number} defaultValue - Default value to return if `n` is invalid.
   * @param {String} defaultUnit - Default unit type to return the input as if not included in `n`.
   * @returns {UnitValue}
   */
  export function parseNumberInput(n, defaultValue, defaultUnit) {
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
  };

    /**
   * Read ExtendScript "json-like" data from file.
   * @param {File} f File object to read.
   * @returns {Object} Evaluated JSON data.
   */
  export function readJSONData(f) {
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
    // TODO: don't use eval
    return obj;
  };
  
  /**
   * Write ExtendScript "json-like" data to disk.
   * @param {Object} data Data to be written.
   * @param {File} f File object to write to.
   * @returns {Boolean} Write success.
   */
  export function writeJSONData(data, f) {
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
  };

    /**
   * Determine the base calling script from the current stack.
   * @returns {String} Initial script name.
   */
  export function resolveBaseScriptFromStack() {
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
  };

