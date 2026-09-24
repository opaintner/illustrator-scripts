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
  
  // TODO: Find a better way to do this settings thingy - it seems wrong somehow
  
  
  
  export var defaults = {};
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
