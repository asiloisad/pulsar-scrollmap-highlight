const { CompositeDisposable, Disposable } = require("atom");

module.exports = {

  activate() {
    this.editors = new Map();
    this.highlightService = null;
  },

  deactivate() {
    this.editors.clear();
    this.highlightService = null;
  },

  consumeHighlightService(highlightService) {
    this.highlightService = highlightService;

    const updateAll = () => {
      for (const ctx of this.editors.values()) {
        ctx.update();
      }
    };

    let addSubscription = highlightService.onDidFinishAddingMarkers?.(updateAll);
    let removeSubscription = highlightService.onDidRemoveAllMarkers?.(updateAll);

    return new Disposable(() => {
      this.highlightService = null;
      addSubscription?.dispose();
      removeSubscription?.dispose();
    });
  },

  provideScrollmap() {
    const self = this;
    return {
      name: "highlight",
      subscribe: (editor, update) => {
        self.editors.set(editor, { update });
        return new Disposable(() => self.editors.delete(editor));
      },
      recalculate: (editor) => {
        if (!self.highlightService) {
          return [];
        }
        const layers = self.highlightService.editorToMarkerLayerMap?.[editor.id];
        if (!layers?.markerLayer) {
          return [];
        }
        const markers = layers.markerLayer.getMarkers();
        return markers.map((marker) => ({
          row: marker.getScreenRange().start.row,
        }));
      },
    };
  },
};
