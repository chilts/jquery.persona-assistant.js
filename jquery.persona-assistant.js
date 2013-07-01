// ----------------------------------------------------------------------------
//
// jquery.persona-assistant.js
//
// Copyright (c) Andrew Chilton 2013 - http://chilts.org/blog/
//
// License - http://chilts.mit-license.org/2013/
//
// ----------------------------------------------------------------------------

(function($) {

    // create all of our command functions
    var commands = {

        'init' : function(options) {
            var $body = this;
            if ( $body.size() === 0 || $body.size() > 1 ) {
                console.log('The matching element set for personaAssistant should be of length one');
                return;
            }

            // create and store the 'opts' data on the element
            var opts = $.extend({}, $.fn.personaAssistant.defaults, options);
            $body.data('opts', opts);

            // get the user - if it's the empty string, set it to be null which is more appropriate
            // From: https://developer.mozilla.org/en-US/docs/Web/API/navigator.id.watch#Parameters
            var user = $body.data('email') || null;

            // setup some functions which can help us
            function showLoggedIn() {
                console.log('showLoggedIn() : entry');
                $(opts.loggedInSelector).show();
                $(opts.loadingSelector).hide();
                $(opts.loggedOutSelector).hide();
            }
            function showLoading() {
                console.log('showLoading() : entry');
                $(opts.loggedInSelector).hide();
                $(opts.loadingSelector).show();
                $(opts.loggedOutSelector).hide();
            }
            function showLoggedOut() {
                console.log('showLoggedOut() : entry');
                $(opts.loggedInSelector).hide();
                $(opts.loadingSelector).hide();
                $(opts.loggedOutSelector).show();
            }

            // if we *think* someone is logged in, show that, else show them as logged out
            if ( user ) {
                showLoggedIn();
            }
            else {
                showLoggedOut();
            }

            // when someone clicks the login button, request Persona to authenticate the user
            $(opts.loginBtn).click(function(ev) {
                ev.preventDefault();
                showLoading();
                console.log('Clicked login ...');
                navigator.id.request();
            });

            // when someone clicks the logout button, tell Persona to logout
            $(opts.logoutBtn).click(function(ev) {
                ev.preventDefault();
                console.log('Clicked logout ...');

                // after this is called, the onlogout() event from navigator.id.watch() will be called
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

                    // show only the loading elements
                    showLoading();

                    console.log('*** calling POST ' + opts.loginJsonUrl + ' ***');
                    $.ajax({
                        type: 'POST',
                        url: opts.loginJsonUrl,
                        data: { assertion : assertion },
                        success: function(res, status, xhr) {
                            console.log(res);

                            // store the email address on $body
                            $body.data('email', res.email);

                            // ... and show it on the page (if opts.storeEmailSelector matches any element)
                            $(opts.storeEmailSelector).text(res.email);

                            // redirect or show depending on the mode
                            if ( opts.mode === 'classic' ) {
                                window.location.reload(true);
                            }
                            else {
                                showLoggedIn();
                                opts.onLogin(res);
                            }
                        },
                        error: function(xhr, status, err) {
                            navigator.id.logout();
                        }
                    });
                },
                match : function() {
                    console.log('match(): entry');
                },
                onlogout : function() {
                    // A user has logged out! Here you need to:
                    // Tear down the user's session by redirecting the user or making a call to your backend.
                    console.log('onlogout(): entry');

                    // wipe the email that we think is logged in
                    $body.data('email', '');

                    if ( opts.mode === 'classic' ) {
                        window.location = opts.logoutUrl;
                    }
                    else {
                        showLoggedOut();
                        $(opts.onLogoutDeleteSelector).remove();

                        // if this is still on the page, make it blank
                        $(opts.storeEmailSelector).text('');

                        // finally, call the listener
                        opts.onLogout();
                    }
                }
            });

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
        // default mode is 'classic' (out of 'classic' and 'application')
        mode               : 'classic',

        // queries to show/hide elements at the appropriate time
        loggedInSelector   : '.persona-logged-in',
        loadingSelector    : '.persona-loading',
        loggedOutSelector  : '.persona-logged-out',

        // buttons to log in/out
        loginBtn           : '.persona-login',
        logoutBtn          : '.persona-logout',

        // where to set the email we received back (optional)
        storeEmailSelector : '.persona-email',

        // urls we should hit at various times
        loginJsonUrl       : '/login.json',
        logoutUrl          : '/logout',
        logoutJsonUrl      : '/logout.json',

        // --- options for 'classic' mode ---

        // --- options for 'application' mode ---
        // queries to remove elements from the page when logged out (application
        onLogoutRemoveSelector : '.persona-logout-remove',
        // events you can listen on so you can do something else appropriate
        onLogin                : function(user) {},
        onLogout               : function() {},
        onLoading              : function() {}

    };

})(jQuery);

// ----------------------------------------------------------------------------
