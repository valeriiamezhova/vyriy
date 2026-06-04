/* ─── Service Cart Integration ─── */
(function() {
    var SERVICE_DATA = {
        'services-funeral-arrangements.html': {
            id: 'svc-funeral',
            name: 'Організація церемонії поховання',
            price: 8500,
            includes: ['Персональний супровід', 'Синхронізація служб', 'Сценарій прощання', 'Естетика та таймінг', 'Координація всіх учасників']
        },
        'services-legal.html': {
            id: 'svc-legal',
            name: 'Юридичний супровід',
            price: 1500,
            includes: ['Первинний аудит', 'Представництво інтересів', 'Державні субсидії', 'Спадкове право']
        },
        'services-сremation.html': {
            id: 'svc-cremation',
            name: 'Кремація тіла',
            price: 6000,
            includes: ['Документальний допуск', 'Церемоніальний зал', 'Державний збір', 'Капсулювання праху']
        },
        'services-embalmment.html': {
            id: 'svc-embalmment',
            name: 'Бальзамування',
            price: 3500,
            includes: ['Професійний виїзд', 'Біофіксація', 'Танатоестетика', 'Гігієнічний комплекс']
        },
        'services-exhumation.html': {
            id: 'svc-exhumation',
            name: 'Ексгумація та перепоховання',
            price: 18000,
            includes: ['Дозвільна документація', 'Технічні роботи', 'Спецконтейнер', 'Санітарна безпека']
        },
        'services-cemetery.html': {
            id: 'svc-cemetery',
            name: 'Підбір місця та оформлення на кладовищі',
            price: 4500,
            includes: ['Правовий аудит локацій', 'Офіційне погодження', 'Інспекція ділянки']
        },
        'services-dinners.html': {
            id: 'svc-dinners',
            name: 'Організація поминального обіду',
            price: 450,
            includes: ['Локація «під ключ»', 'Канонічне меню', 'Сервіс і таймінг', 'Приватність']
        },
        'services-storage.html': {
            id: 'svc-storage',
            name: 'Зберігання тіла',
            price: 500,
            includes: ['Кліматичний бокс', 'Температурний контроль', 'Моніторинг стану', 'Синхронізація видачі']
        },
        'services-repatriation.html': {
            id: 'svc-repatriation',
            name: 'Вантаж 200 та репатріація',
            price: 0,
            priceLabel: 'за розрахунком',
            includes: ['Консульська легалізація', 'Герметичний бокс', 'Мультимодальна логістика', 'Митне вікно']
        },
        'services-transportation.html': {
            id: 'svc-transportation',
            name: 'Транспортування тіла',
            price: 2500,
            includes: ['Спеціальний автомобіль', 'Професійний транзит', 'Клімат-салон', 'Навігація маршруту']
        }
    };

    /* Normalize filename — handle Cyrillic in URL encoding */
    function getCurrentPageFile() {
        var raw = window.location.pathname.split('/').pop() || '';
        try { return decodeURIComponent(raw); } catch(e) { return raw; }
    }

    function getBtn() {
        return document.querySelector('.sc-btn-primary');
    }

    var CHECK_ICON =
        '<span style="display:inline-block;width:16px;height:15px;flex-shrink:0;vertical-align:middle;' +
        'background-color:#fff;margin-right:8px;' +
        '-webkit-mask-image:url(icons/check.svg);mask-image:url(icons/check.svg);' +
        '-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;' +
        '-webkit-mask-size:contain;mask-size:contain;' +
        '-webkit-mask-position:center;mask-position:center;"></span>';

    function setBtnAdded(btn, orig) {
        btn.disabled = true;
        btn.style.cssText += 'background:#3C9264!important;color:#fff!important;transition:background .2s;';
        btn.innerHTML = CHECK_ICON + 'Додано в кошик';
        setTimeout(function() {
            btn.disabled = false;
            btn.style.background = '';
            btn.style.color = '';
            btn.innerHTML = orig;
        }, 2000);
    }

    function setBtnAlready(btn, orig) {
        /* No icon — just a muted color shift */
        btn.style.cssText += 'background:#B3CDD9!important;color:#1B3F57!important;transition:background .2s;';
        btn.innerHTML = 'Вже в кошику';
        setTimeout(function() {
            btn.style.background = '';
            btn.style.color = '';
            btn.innerHTML = orig;
        }, 2000);
    }

    window.addServiceToCart = function() {
        if (!window.CartStorage) return;

        var file = getCurrentPageFile();
        var svc = SERVICE_DATA[file];
        if (!svc) {
            console.warn('service-cart: no data for', file);
            return;
        }

        var btn = getBtn();
        var origHTML = btn ? btn.innerHTML : '';

        var cart = CartStorage.get();
        var exists = cart.some(function(i) { return i.id === svc.id; });

        if (exists) {
            if (btn) setBtnAlready(btn, origHTML);
            CartStorage.toast('Послуга вже є в кошику');
            return;
        }

        /* Add to cart */
        CartStorage.add({
            id: svc.id,
            type: 'service',
            name: svc.name,
            price: svc.price,
            priceLabel: svc.priceLabel || null,
            includes: svc.includes,
            qty: 1
        });

        /* Explicit toast call (backup — CartStorage.add also calls it internally) */
        CartStorage.toast(svc.name);

        /* Button feedback */
        if (btn) setBtnAdded(btn, origHTML);
    };
})();
