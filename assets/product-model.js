if (!customElements.get('product-model')) {
  /**
   * Deferred media component for loading 3D product models.
   * @extends DeferredMedia
   */
  customElements.define('product-model', class ProductModel extends DeferredMedia {
    constructor() {
      super();
    }

    /** Loads media content and initializes Shopify ModelViewer UI feature. */
    loadContent() {
      super.loadContent();

      Shopify.loadFeatures([
        {
          name: 'model-viewer-ui',
          version: '1.0',
          onLoad: this.setupModelViewerUI.bind(this),
        },
      ]);
    }

    /**
     * Initializes ModelViewerUI instance on the model element.
     * @param {Error[]} [errors]
     */
    setupModelViewerUI(errors) {
      if (errors) return;

      this.modelViewerUI = new Shopify.ModelViewerUI(this.querySelector('model-viewer'));
    }
  });
}

/** Utility module for managing Shopify AR/XR 3D model integrations. */
window.ProductModel = {
  /** Loads the Shopify XR feature script. */
  loadShopifyXR() {
    Shopify.loadFeatures([
      {
        name: 'shopify-xr',
        version: '1.0',
        onLoad: this.setupShopifyXR.bind(this),
      },
    ]);
  },

  /**
   * Initializes ShopifyXR and registers JSON models found on the page.
   * @param {Error[]} [errors]
   */
  setupShopifyXR(errors) {
    if (errors) return;

    if (!window.ShopifyXR) {
      document.addEventListener('shopify_xr_initialized', () => this.setupShopifyXR());
      return;
    }

    document.querySelectorAll('[id^="ProductJSON-"]').forEach((modelJSON) => {
      window.ShopifyXR.addModels(JSON.parse(modelJSON.textContent));
      modelJSON.remove();
    });
    window.ShopifyXR.setupXRElements();
  },
};

window.addEventListener('DOMContentLoaded', () => {
  if (window.ProductModel) window.ProductModel.loadShopifyXR();
});