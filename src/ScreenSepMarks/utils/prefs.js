  import * as utils from "./sharedUtils.js";
  
  /**
   * Module for easily storing script preferences.
   * @param {String} fp File path for the for the saved preferences "JSON-like" file. Defaults to `Folder.userData/{base_script_file_name}.json`.
   * @param {String} version Optional script version number to include in the preferences file. Helps with debugging.
   * @param {Object} logger Optional logger for debugging. Defaults to `$.writeln()`.
   */
  export function Prefs(fp, version, logger) {
    if (typeof fp == "undefined")
      fp = Folder.userData + "/" + utils.resolveBaseScriptFromStack() + ".json";

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
          json = utils.readJSONData(f);
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
              corruptFile
            );
          } catch (ex) {
            alert(
              "Preferences file parse error. Failed to create backup.\nOriginal file:\n" +
              f
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
            "Bad preferences file path!\n" + this.file + "'"
          );
          return false;
        }
        f.parent.create();
      }

      // setup the data object
      var d = {
        data: this.data,
        version: this.version,
        timestamp: Date.now()
      };
      return utils.writeJSONData(d, f);
    }
  };