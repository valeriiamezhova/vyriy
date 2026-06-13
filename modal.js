(function () {
    function openVrModal() {
        var modal = document.getElementById('vrModal');
        if (!modal) return;
        modal.classList.add('is-open');
        document.body.style.overflow = 'hidden';
        var input = modal.querySelector('#vr-phone');
        if (input) setTimeout(function () { input.focus(); }, 80);
    }

    function closeVrModal() {
        var modal = document.getElementById('vrModal');
        if (!modal) return;
        modal.classList.remove('is-open');
        document.body.style.overflow = '';
        setTimeout(function () {
            var form = document.getElementById('vrModalForm');
            var success = document.getElementById('vrModalSuccess');
            if (form) { form.style.display = ''; form.reset(); }
            if (success) success.style.display = 'none';
        }, 300);
    }

    document.addEventListener('DOMContentLoaded', function () {
        var overlay = document.getElementById('vrModal');
        if (!overlay) return;

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closeVrModal();
        });

        var closeBtn = document.getElementById('vrModalClose');
        if (closeBtn) closeBtn.addEventListener('click', closeVrModal);

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') closeVrModal();
        });

        var form = document.getElementById('vrModalForm');
        if (form) {
            form.addEventListener('submit', function (e) {
                e.preventDefault();
                form.style.display = 'none';
                var success = document.getElementById('vrModalSuccess');
                if (success) success.style.display = 'flex';
            });
        }
    });

    window.openVrModal = openVrModal;
    window.closeVrModal = closeVrModal;
})();
