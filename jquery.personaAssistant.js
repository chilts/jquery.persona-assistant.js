//
// jquery.personaAssistant.js
//
// Copyright (c) Andrew Chilton 2013 - http://chilts.org/blog/
//
// License - http://chilts.mit-license.org/2013/
//

(function($) {

    // create all of our command functions
    var commands = {

        'init' : function(options) {
            var $body = this;
            if ( $body.size() === 0 || $body.size() > 1 ) {
                console.log('The matching element set for jquery.personaAssistant should be of length one');
                return;
            }

            // create and store the 'opts' data on the element
            var opts = $.extend({}, $.fn.personaAssistant.defaults, options);
            $body.data('opts', opts);

            var user = $(opts.userQuery).data('email');
            console.log(user);

            $(opts.loggedInQuery).hide();
            $(opts.loadingQuery).show();
            $(opts.loggedOutQuery).hide();

            // when someone clicks the login button, request Persona to authenticate the user
            $(opts.loginBtn).click(function(ev) {
                ev.preventDefault();
                $(opts.loggedInQuery).hide();
                $(opts.loadingQuery).show();
                $(opts.loggedOutQuery).hide();
                console.log('Clicked login ...');
                navigator.id.request();
            });

            // when someone clicks the logout button, tell Persona to logout
            $(opts.logoutBtn).click(function(ev) {
                ev.preventDefault();
                console.log('Clicked logout ...');
                $(opts.loggedInQuery).hide();
                $(opts.loadingQuery).show();
                $(opts.loggedOutQuery).hide();
                navigator.id.logout();
            });

            // now, call the navigator.id.watch() so we can see what is going on
            navigator.id.watch({
                loggedInUser : user,
                onlogin : function(assertion) {
                    // A user has logged in! Here you need to:
                    // 1. Send the assertion to your backend for verification and to create a session.
                    // 2. Update your UI.
                    console.log('onlogin(): entry');

                    $.ajax({
                        type: 'POST',
                        url: '/login',
                        data: { assertion : assertion },
                        success: function(res, status, xhr) {
                            console.log(res);

                            // set the email address
                            $(opts.userQuery).text(res.user);
                            $(opts.userQuery).data('email', res.email);

                            // now show the relevant things
                            $(opts.loggedInQuery).show();
                            $(opts.loadingQuery).hide();
                            $(opts.loggedOutQuery).hide();
                        },
                        error: function(xhr, status, err) {
                            navigator.id.logout();
                        }
                    });

                    $(opts.loggedInQuery).show();
                    $(opts.loadingQuery).hide();
                    $(opts.loggedOutQuery).hide();
                },
                onlogout : function() {
                    // A user has logged out! Here you need to:
                    // Tear down the user's session by redirecting the user or making a call to your backend.
                    console.log('onlogout(): entry');
                    $(opts.loggedInQuery).hide();
                    $(opts.loadingQuery).hide();
                    $(opts.loggedOutQuery).show();
                }
            });

            // finally, watch what's happening
            navigator.id.watch();

            return this;
        }

    };

    // plugin 'personaAssistant'
    $.fn.personaAssistant = function(command, options) {

        // Method calling logic
        if ( commands[command] ) {
            return commands[command].apply( this, Array.prototype.slice.call( arguments, 1 ));
        } else if ( typeof command === 'object' || ! command ) {
            return commands.init.apply( this, arguments );
        } else {
            $.error( 'Command ' +  command + ' does not exist on jQuery.personaAssistant' );
        }

    }

    // plugin defaults
    $.fn.personaAssistant.defaults = {
        userQuery      : '#persona-user',
        loggedInQuery  : '.persona-logged-in',
        loadingQuery   : '.persona-loading',
        loggedOutQuery : '.persona-logged-out',
        loginBtn       : '#persona-login',
        logoutBtn      : '#persona-logout',
        onLogin        : function() {},
        onLogout       : function() {},
        onLoading      : function() {}
    };

})(jQuery);
