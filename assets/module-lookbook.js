/**
 * Initializes a interactive lookbook hotspot item.
 * @param {HTMLElement} obj
 */
export function startLookbook(obj) {
    const square = new Lookbook(obj);
}

/**
 * Manages lookbook hotspots, product card overlays, and associated slider navigation.
 */
class Lookbook {
    constructor(obj) {
        this.obj = obj;
        this.obj.addEventListener('click', this.clickHandler.bind(this));
        this.obj.querySelector('.bullet-product-card-close').addEventListener('click', this.clickOverlayHandler.bind(this));
        this.obj.querySelector('.bullet-product-card__overlay').addEventListener('click', this.clickOverlayHandler.bind(this));
        this.obj.closest('.lookbook__container').querySelector('.swiper') && this.obj.addEventListener('mouseover', this.sliderHandler.bind(this));
        window.addEventListener('resize', this.resizeHandler.bind(this));
        this.resizeHandler();
    }

    /**
     * Navigates the linked Swiper slider to the hovered product's slide.
     * @param {MouseEvent} e
     */
    sliderHandler(e){
        if(!e.currentTarget.hasAttribute('data-product-id')) return
        var id = e.currentTarget.getAttribute('data-product-id');
        var gallery = this.obj.closest('.lookbook__container');
        var src = gallery.querySelector(`.swiper .swiper-slide [id="${id}"]`),
        ind = src.closest('[data-swiper-slide-index]').getAttribute('data-swiper-slide-index'),
        delay = 300;
        gallery.querySelector('.swiper').selectSlide(ind, delay);
    }
    clickHandler(e){
        e.preventDefault();
        if(window.innerWidth > 1024) return false;
        this.obj.parentNode.querySelectorAll('.active').forEach((item) => {
            item.classList.remove('active');
        });
        e.currentTarget.classList.add('active');
        if(window.innerWidth > 577 || this.obj.closest('.lookbook__container').querySelector('.swiper')) return;
        document.body.classList.add('overflow-hidden');
    }
    clickOverlayHandler(e){
        e.preventDefault();
        e.stopPropagation();
        document.body.classList.remove('overflow-hidden');
        if(window.innerWidth > 1024) return false;
        this.obj.parentNode.querySelectorAll('.active').forEach((item) => {
            item.classList.remove('active');
        });
    }

    /** Adjusts product card alignment based on available viewport space. */
    resizeHandler(){
        const bullet = this.obj.getBoundingClientRect();
        const bullet_product = this.obj.querySelector('.bullet-product-card').getBoundingClientRect();
        let left = bullet.left - bullet_product.width;
        left < 0?this.obj.querySelector('.bullet-product-card').classList.add('right'):this.obj.querySelector('.bullet-product-card').classList.remove('right');
    }
}