+function ($) {

    // TODO:
    // - Bootstrap grid is having an effect when not really needed when resizing window
    // - and when moving the dialog near the edge of the window
    // - Animate minimize/maximize?  (Especially so list of already minimized dialogs doesn't jerk)
    // - checkWindowBounds needs testing
    // - We could make multiple dialogs cascade, to help separate them

    var FloatingDialog = function (template, options) {
        this.options = options

        // If the original template had an ID, we remove it from the clone
        // Also the template may have (should have) been protected from modification by Angular
        // so we remove the ng-non-bindable attribute so that Angular can bind to the clone.
        this.$dialog = $(template).clone()
            .removeAttr('id')
            .removeAttr('ng-non-bindable')

        this.$minimizedFrame = $(options.minimizedFrame)
    }

    FloatingDialog.DEFAULTS = {
        minimizedFrame: '.dialog-frame'
    }

    FloatingDialog.prototype.init = function () {
        var $dialog = this.$dialog
        var options = this.options

        if (options.childScope) {
            this.$childScope = options.$scope.$new(true)
            $.extend(this.$childScope, options.childScope)
            options.$compile($dialog)(this.$childScope)
        } else if (options.$scope) {
            options.$compile($dialog)(options.$scope)
        }

        // Which side should new dialogs be placed on?
        //if ($dialog.css('float') === "right") {
        //    $dialog.prependTo(options.minimizedFrame)
        //} else {
        //    $dialog.appendTo(options.minimizedFrame)
        //}

        // Position the dialog
        $dialog.removeClass('hidden').addClass('fade').addClass('windowed').appendTo('body')
        $dialog.css({
            position: "fixed",
            top: 0,
            left: 0
        })

        setTimeout(function () {
            // The dialog's width and height only assume the correct values after a tick
            this.positionAtCenterOfWindow()

            // Similarly the fade in effect only works if applied *after* .hidden is removed
            $dialog.addClass('in')
        }.bind(this), 0)
        return $dialog
    }

    FloatingDialog.prototype.close = function () {
        var $dialog = this.$dialog

        if (this.$childScope) {
            this.$childScope.$destroy()
        }

        // Makes the window fade out
        $dialog.removeClass('in')

        // Makes the window shrink; useful so that other dialogs move smoothly into their new position,
        // instead of jerking into position when the remove happens
        if ($dialog.is('.minimized')) {
            $dialog.animate({width: 0, height: 0}, 300)
        }

        setTimeout(function () {
            $dialog.remove()
        }, 300)
    }

    FloatingDialog.prototype.positionAtCenterOfWindow = function () {
        var windowWidth = $(window).innerWidth()
        var windowHeight = $(window).innerHeight()
        var dialogWidth = this.$dialog.width()
        var dialogHeight = this.$dialog.height()
        //console.log("windowWidth, windowHeight:", windowWidth, windowHeight);
        //console.log("dialogWidth, dialogHeight:", dialogWidth, dialogHeight);
        var randomOffset = function (magnitude) { return -magnitude + 2 * magnitude * Math.random() }
        this.$dialog.css({
            position: "fixed",
            top: windowHeight/2 - dialogHeight/2 + randomOffset(40),
            left: windowWidth/2 - dialogWidth/2 + randomOffset(40)
        })
    }

    FloatingDialog.prototype.minimize = function () {
        //this.$dialog.find('.dialog-body, .dialog-footer').addClass('hidden')
        this.$dialog.removeClass('windowed').css({
            position: ''
        })
        this.$dialog.addClass('minimized')
        this.$dialog.appendTo(this.$minimizedFrame)
        //this.$dialog.find('[data-toggle=minimize]').addClass('hidden')
    }

    FloatingDialog.prototype.restore = function () {
        //this.$dialog.find('.dialog-body, .dialog-footer').removeClass('hidden')
        this.$dialog.appendTo("body")
        //this.$dialog.find('[data-toggle=minimize]').removeClass('hidden')
        this.$dialog.removeClass('minimized')
        this.$dialog.addClass('windowed').css({
            position: 'fixed'
        })
        // We restore to previous position
        // But if the browser has been resized since then, the window might be out of view!
        // Let's check...
        this.checkWindowBounds()
    }

    FloatingDialog.prototype.checkWindowBounds = function () {
        this.$dialog.clientWidth // Force browser relayout
        var position = this.$dialog.offset()
        if (position.left + this.$dialog.width() >= $(window).innerWidth()) {
            this.$dialog.css({left: $(window).innerWidth() - this.$dialog.width()})
        }
        if (position.top + this.$dialog.height() >= $(window).innerHeight()) {
            this.$dialog.css({top: $(window).innerHeight() - this.$dialog.height()})
        }
    }

    FloatingDialog.prototype.startDrag = function (e) {
        var that = this
        var $dialog = this.$dialog
        var dragStarted = false
        var mouseStartPosition = {
            left: e.pageX,
            top: e.pageY
        }
        var dialogStartPosition = {
            left: parseInt($dialog.css('left'), 0),
            top: parseInt($dialog.css('top'), 0)
        }
        $(document).on('mousemove', processMove)
        $(document).one('mouseup', endDrag)
        function processMove (e) {
            var offset = {
                x: e.pageX - mouseStartPosition.left,
                y: e.pageY - mouseStartPosition.top
            }
            if (Math.abs(offset.x) > 5 || Math.abs(offset.y) > 5) {
                dragStarted = true
            }
            if (dragStarted) {
                $dialog.css({
                    left: dialogStartPosition.left + offset.x,
                    top: dialogStartPosition.top + offset.y
                })
            }
        }
        function endDrag () {
            $(document).off('mousemove', processMove)
            if ($dialog.is('.windowed') && !dragStarted) {
                // A mousedown and a mouseup without a drag is a click
                // Minimize on click
                // But what if they clicked on the header to bring this dialog to the front?
                // Only minimize on if this is the top dialog.  Slightly inconsistent behaviour.  :-(
                // It might be acceptable if the behaviour would offer itself visually, e.g. by highlighting the minimize button when the header is hovered, if clicking the header would produce minimzation.
                // But that isn't working anyway, because bring-to-front fires on mousedown, so the window is always in front by the time this mouseup fires!
                // If we managed to get bring-to-front to fire after this instead of before it, then its action would conflict with the minimize.
                // For this to work, we would need the logic to ensure only one or the other happens.
                // For now, disabling this feature.
                //if (isLastDialog($dialog)) {
                //    that.minimize()
                //}
            }
        }
    }

    var isLastDialog = function ($dialog) {
        return $dialog.parent().children('.dialog-dialog').last().is($dialog);
    }

    FloatingDialog.prototype.bringToFront = function (e) {
        // If this dialog is already in front, do nothing.
        // Previously, calling .appendTo() when we didn't need to was
        // disruptive, e.g. it prevented select boxes from working.
        if (!isLastDialog(this.$dialog)) {
            this.$dialog.appendTo('body')
        }
    }

    $.fn.floatingDialog = function floatingDialog (option, parameters) {
        if (this.length === 0) {
            console.warn("collapsibleDialog called on empty selector; perhaps the template you referenced ('" + this.selector() + "') does not exist?")
        }
        return this.each(function () {
            var $this = $(this)
            var data = $this.data('ss.floating-dialog')
            var options = $.extend({}, FloatingDialog.DEFAULTS, $(this).data(), typeof option == 'object' && option)

            if (!data) {
                data = new FloatingDialog(this, options)
                data.$dialog.data('ss.floating-dialog', data)
            }
            if (typeof option === 'string') data[option](parameters)
            else data.init(parameters)
        })
    }

    function getData (element) {
        return $(element).closest('.dialog-dialog').data('ss.floating-dialog')
    }

    function isButton (element) {
        return $(element).closest('[data-dismiss=dialog], [data-toggle=minimize], .close, .minimize').length > 0
    }

    $(document).on('click', '.dialog-dialog [data-dismiss=dialog]', function (e) {
        getData(this).close()
    })

    $(document).on('click', '.dialog-dialog.windowed .dialog-header [data-toggle=minimize]', function (e) {
        getData(this).minimize()
    })

    $(document).on('click', '.dialog-dialog.minimized .dialog-header', function (e) {
        // If the user has clicked on a button, then do nothing
        if (isButton(e.target)) {
            return
        }
        var data = getData(this)
        data.restore()
        data.bringToFront()
    })

    $(document).on('mousedown', '.dialog-dialog.windowed .dialog-header', function (e) {
        if (isButton(e.target)) {
            return
        }
        getData(this).startDrag(e)
    })

    $(document).on('mousedown', '.dialog-dialog.windowed', function (e) {
        if (isButton(e.target)) {
            return
        }
        getData(this).bringToFront()
    })

    // Also minimize by simply clicking anywhere on the header (not dragging on header)
    //$(document).on('click', '.dialog-dialog.windowed .dialog-header', function (e) {
    //    // If the user has clicked on a button, then do nothing
    //    if (isButton(e.target)) {
    //        return
    //    }
    //    getData(this).minimize()
    //})

}(jQuery)
