/** Assemble LAYOUTS[] from per-theme modules. Load after themes/00-engine.js and all NN-*.js files. */
var LAYOUTS = [
  window._THEME_01_PRISM, window._THEME_02_AURORA, window._THEME_03_GRID_BURST, window._THEME_04_CIRCUIT,
  window._THEME_05_ORIGAMI, window._THEME_06_HALO, window._THEME_07_DUSK, window._THEME_08_LAYERS,
  window._THEME_09_CRYSTAL, window._THEME_10_METRO, window._THEME_11_TOPO, window._THEME_12_COSMOS,
  window._THEME_13_OCEAN, window._THEME_14_FIRE, window._THEME_15_DESERT, window._THEME_16_MATRIX,
  window._THEME_17_FOREST, window._THEME_18_STORM, window._THEME_19_CITY, window._THEME_20_WINTER,
  window._THEME_21_BLOOM, window._THEME_22_WAVE, window._THEME_23_SOUND, window._THEME_24_MOUNTAINS,
  window._THEME_25_DNA, window._THEME_26_DUST, window._THEME_27_HONEYCOMB, window._THEME_28_GALAXY,
  window._THEME_29_CAUSTICS, window._THEME_30_STARFALL, window._THEME_31_SAKURA, window._THEME_32_MAP,
  window._THEME_33_DUCKS, window._THEME_34_NOTEBOOK_GRID, window._THEME_35_NOTEBOOK_LINED,
  window._THEME_36_SWAMP, window._THEME_37_TILE
].filter(Boolean);
