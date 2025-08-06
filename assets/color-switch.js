document.addEventListener("DOMContentLoaded",function(){document.querySelectorAll(".product-color-swatches").forEach(function(t){const o=t.closest("[data-product-id]").querySelector("img");t.querySelectorAll(".color-dot").forEach(function(c){c.addEventListener("click",function(){const e=this.dataset.variantImg;e&&o&&(o.src=e)})})})});
//# sourceMappingURL=color-switch.js.map
