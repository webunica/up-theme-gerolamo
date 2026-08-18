/**
 * Handles language and country/currency localization dropdown selectors.
 * @extends HTMLElement
 */
class LocalizationForm extends HTMLElement {
  constructor() {
    super();
    this.elements = {
      input: this.querySelector('input[name="locale_code"], input[name="country_code"]'),
      button: this.querySelector('button'),
      panel: this.querySelector('.disclosure_element'),
    };
    this.elements.button.addEventListener('click', this.openSelector.bind(this));
    this.addEventListener('focusout', this.closeSelector.bind(this));
    this.addEventListener('keyup', this.onContainerKeyUp.bind(this));

    this.querySelectorAll('a').forEach(item => item.addEventListener('click', this.onItemClick.bind(this)));
  }

  hidePanel() {
    this.elements.button.setAttribute('aria-expanded', 'false');
    this.elements.panel.setAttribute('hidden', true);
  }

  onContainerKeyUp(event) {
    if (event.code.toUpperCase() !== 'ESCAPE') return;
 
    this.hidePanel();
    this.elements.button.focus();
  }

  /**
   * Sets selected value to hidden input and submits localization form.
   * @param {Event} event
   */
  onItemClick(event) {
    event.preventDefault();
    const form = this.querySelector('form');
    this.elements.input.value = event.currentTarget.dataset.value;
    if (form) form.submit();
  }

  /** Toggles display state of localization panel and updates accessibility attributes. */
  openSelector() {
    this.elements.button.focus();
    this.elements.panel.toggleAttribute('hidden');
    this.elements.button.setAttribute('aria-expanded', (this.elements.button.getAttribute('aria-expanded') === 'false').toString());
  }

  /**
   * Closes panel if focus leaves component or overlay is clicked.
   * @param {FocusEvent} event
   */
  closeSelector(event) {
    if (event.target.classList.contains('country-selector__overlay') || !this.contains(event.target) || !this.contains(event.relatedTarget)) {
      this.hidePanel();
    }
  }
}

customElements.define('localization-form', LocalizationForm);