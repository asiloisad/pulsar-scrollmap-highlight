const { CompositeDisposable, Disposable } = require("atom");

module.exports = {
  activate() {
    this.disposables = new CompositeDisposable(
      atom.config.observe("scrollmap-highlight.threshold", (value) => {
        this.threshold = value;
      }),
    );
    this.highlightService = null;
  },

  deactivate() {
    this.highlightService = null;
    this.disposables.dispose();
  },

  getMarkers(editor) {
    const layers = this.highlightService?.editorToMarkerLayerMap?.[editor.id];
    return layers?.markerLayer?.getMarkers() || [];
  },

  consumeHighlightService(highlightService) {
    this.highlightService = highlightService;
    const updateAll = () => {
      for (const editor of atom.workspace.getTextEditors()) {
        const layer = editor.scrollmap?.layers.get("highlight");
        if (!layer) continue;
        layer.cache.set("data", this.getMarkers(editor));
        layer.update();
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
    return {
      name: "highlight",
      description: "Highlight-simple markers",
      initialize: ({ disposables, update }) => {
        disposables.add(atom.config.onDidChange("scrollmap-highlight.threshold", update));
      },
      getItems: ({ cache }) => {
        const data = cache.get("data") || [];
        const items = [];
        let lastItem = null;
        for (const marker of data) {
          const range = marker.getScreenRange();
          const startRow = range.start.row;
          const endRow = range.end.row;
          if (lastItem && startRow <= (lastItem.end ?? lastItem.row) + 1) {
            lastItem.end = endRow;
          } else {
            if (lastItem) items.push(lastItem);
            lastItem = { row: startRow, end: endRow };
          }
        }
        if (lastItem) items.push(lastItem);
        if (this.threshold && items.length > this.threshold) {
          return [];
        }
        return items;
      },
    };
  },
};
