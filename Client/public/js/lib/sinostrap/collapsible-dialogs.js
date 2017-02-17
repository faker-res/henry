+function ($) {

    var CollapsibleDialog = function (element, options) {}

    CollapsibleDialog.DEFAULTS = {
        target: '.dialog-frame'
    }

    $.fn.collapsibleDialog = function collapsibleDialog (option, _relatedTarget) {
        if (this.length === 0) {
            console.warn("collapsibleDialog called on empty selector; perhaps the template you referenced ('" + this.selector() + "') does not exist?");
        }
        return this.each(function () {
            var options = $.extend({}, CollapsibleDialog.DEFAULTS, $(this).data(), typeof option == 'object' && option)

            // If the original template had an ID, we remove it from the clone
            // Also the template may have (should have) been protected from modification by Angular
            // so we remove the ng-non-bindable attribute so that Angular can bind to the clone.
            var newDialog = $(this).clone()
                .removeAttr('id')
                .removeAttr('ng-non-bindable')

            var $childScope = null
            if (options.childScope) {
                $childScope = options.$scope.$new(true)
                $.extend($childScope, options.childScope)
                options.$compile(newDialog)($childScope)
            } else if (options.$scope) {
                options.$compile(newDialog)(options.$scope)
            }

            $('[data-dismiss=dialog]', newDialog).each(function () {
                var dismissButton = $(this)
                dismissButton.on('click', closeDialog)
                dismissButton.on('keyup', closeDialog)
            })

            function closeDialog () {
                newDialog.off('click').off('keyup')
                if (options.childScope) {
                    $childScope.$destroy()
                }

                // Makes the window fade out
                newDialog.removeClass('in')

                // Makes the window shrink; useful so that other dialogs move smoothly into their new position,
                // instead of jerking into position when the remove happens
                newDialog.animate({width: 0, height: 0}, 300)

                setTimeout(function () {
                    newDialog.remove()
                }, 300)
            }

            // Which side should new dialogs be placed on?
            if (newDialog.css('float') === "right") {
                newDialog.prependTo(options.target)
            } else {
                newDialog.appendTo(options.target)
            }
            setTimeout(function () {
                newDialog.addClass('in')
            }, 0)
            return newDialog
        })
    }

    $(document).on('click', '.dialog-dialog .dialog-header', function (e) {
        // If the user has clicked on something that will close the dialog, then do not toggle/collapse it
        if ($(e.target).closest('[data-dismiss=dialog]').length) {
            return
        }
        var dialogRest = $(this).siblings('.dialog-body').add( $(this).siblings('.dialog-footer') )
        dialogRest.toggle(200)
    })

}(jQuery)
