window.GeneralModal = {

    confirm: function (opts) {
        if (typeof opts === 'string') {
            opts = {
                text: opts
            };
        }
        opts.title = opts.title || "Are you sure?";
        opts.text = opts.text || "Are you sure?";

        return new Q.Promise(function (resolvePromise, rejectPromise) {

            var $modal = $('#generalConfirmationModal');

            $modal.find('.modal-title').text(opts.title);
            $modal.find('.modal-body p label').text(opts.text);

            var $confirmButton = $modal.find('[data-purpose=confirm]');
            var $cancelButton = $modal.find('[data-purpose=confirm]');

            function addListeners () {
                $confirmButton.one('click', triggerConfirm);
                $cancelButton.one('click', triggerCancel);
                $modal.on('hide.bs.modal', removeListeners);
                // @todo We should also listen for "clicks" caused by hitting <Enter> on the button
                // @todo I guess 'click' is enough for mobile, we don't need to listen for touch events
            }

            function removeListeners () {
                $confirmButton.off('click');
                $cancelButton.off('click');
                $modal.off('hide.bs.modal');
            }

            function triggerConfirm () {
                removeListeners();
                if (opts.onConfirm) {
                    opts.onConfirm();
                }
                resolvePromise();
            }

            function triggerCancel () {
                removeListeners();
                if (opts.onCancel) {
                    opts.onCancel();
                }
                rejectPromise();
            }

            $modal.modal('show');
            addListeners();
        });
    }

};