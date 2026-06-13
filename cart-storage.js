/* ─── Vyriy Cart Storage ─── */
(function() {
    var CART_KEY = 'vyriy_cart';

    function getCart() {
        try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
        catch(e) { return []; }
    }

    function saveCart(cart) {
        localStorage.setItem(CART_KEY, JSON.stringify(cart));
        updateCartBadge();
    }

    function addToCart(item) {
        var cart = getCart();
        var existing = null;
        for (var i = 0; i < cart.length; i++) {
            if (cart[i].id === item.id && cart[i].type === item.type && (cart[i].attrs || '') === (item.attrs || '')) {
                existing = cart[i]; break;
            }
        }
        if (existing) {
            existing.qty = (existing.qty || 1) + 1;
        } else {
            item.qty = 1;
            cart.push(item);
        }
        saveCart(cart);
        showToast(item.name);
    }

    function removeFromCart(id, type) {
        var cart = getCart().filter(function(i) {
            return !(i.id === id && i.type === (type || i.type));
        });
        saveCart(cart);
    }

    function updateQty(id, type, qty) {
        var cart = getCart();
        for (var i = 0; i < cart.length; i++) {
            if (cart[i].id === id && cart[i].type === type) {
                cart[i].qty = Math.max(1, qty);
                break;
            }
        }
        saveCart(cart);
    }

    function getCartCount() {
        return getCart().reduce(function(sum, item) {
            return sum + (item.qty || 1);
        }, 0);
    }

    function clearCart() {
        localStorage.removeItem(CART_KEY);
        updateCartBadge();
    }

    /* ── Badge ── */
    function updateCartBadge() {
        var count = getCartCount();
        document.querySelectorAll('.cart-badge').forEach(function(badge) {
            badge.textContent = count > 9 ? '9+' : count;
            badge.hidden = count === 0;
        });
    }

    function initCartBadge() {
        /* badge must be a SIBLING of the link, not a child —
           mask-image masks all descendants, so badge inside the <a> becomes invisible */
        document.querySelectorAll('a.icon-placeholder.cart-icon').forEach(function(link) {
            var wrap = link.parentElement;
            if (!wrap.classList.contains('cart-icon-wrap')) {
                var newWrap = document.createElement('span');
                newWrap.className = 'cart-icon-wrap';
                link.parentNode.insertBefore(newWrap, link);
                newWrap.appendChild(link);
                wrap = newWrap;
            }
            if (!wrap.querySelector('.cart-badge')) {
                var badge = document.createElement('span');
                badge.className = 'cart-badge';
                badge.hidden = true;
                wrap.appendChild(badge);
            }
        });
        updateCartBadge();
    }

    /* ── Toast ── */
    function showToast(name) {
        var existing = document.getElementById('cartToast');
        if (existing) existing.remove();
        var toast = document.createElement('div');
        toast.id = 'cartToast';
        toast.className = 'cart-toast';
        toast.innerHTML =
            '<span class="cart-toast-check"></span>' +
            '<span>' + (name || 'Товар') + ' додано в кошик</span>' +
            '<a href="cart.html" class="cart-toast-link">Переглянути</a>';
        document.body.appendChild(toast);
        requestAnimationFrame(function() { toast.classList.add('is-visible'); });
        setTimeout(function() {
            toast.classList.remove('is-visible');
            setTimeout(function() { toast.remove(); }, 300);
        }, 3000);
    }

    /* ── Public API ── */
    window.CartStorage = {
        get: getCart,
        save: saveCart,
        add: addToCart,
        remove: removeFromCart,
        updateQty: updateQty,
        count: getCartCount,
        clear: clearCart,
        updateBadge: updateCartBadge,
        toast: showToast
    };

    document.addEventListener('DOMContentLoaded', initCartBadge);
})();
