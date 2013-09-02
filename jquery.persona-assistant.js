// ----------------------------------------------------------------------------
//
// jquery.persona-assistant.js
//
// Copyright (c) Mozilla 2013
//
// Written by Andrew Chilton <chilts@mozilla.com> (@andychilton)
//
// License - http://chilts.mit-license.org/2013/
//
// ----------------------------------------------------------------------------

(function($) {

    // See https://developer.mozilla.org/en-US/docs/Web/API/navigator.id.request
    // Note: ignoring returnTo.
    var requestParams = [ 'backgroundColor', 'privacyPolicy', 'siteLogo', 'siteName', 'termsOfService' ];

    // takes the options, loops through the requestParams, sets any passed in and returns it
    function makeRequestParams(opts) {
        var params = {};
        for ( var i = 0, paramName; i < requestParams.length; i++ ) {
            paramName = requestParams[i];
            console.log(paramName);
            if ( opts[paramName] ) {
                console.log('* ' + opts[paramName]);
                params[paramName] = opts[paramName];
            }
        }
        console.log(params);
        return params;
    }

    // create all of our command functions
    var commands = {

        'init' : function(options) {
            var $body = $('body');
            if ( $body.size() === 0 || $body.size() > 1 ) {
                console.log('The matching element set for personaAssistant should be of length one');
                return;
            }

            // create the opts from:
            // 1) nothing (ie. {})
            // 2) the 'classic' or 'application' mode (or nothing)
            // 3) finally, the options passed in
            var opts = $.extend({}, $.personaAssistant.defaults);
            if ( options.mode === 'classic' ) {
                opts = $.extend(opts, $.personaAssistant.classic);
            }
            else if ( options.mode === 'application' ) {
                opts = $.extend(opts, $.personaAssistant.application);
            }
            else {
                // unknown mode, so we won't extend 'opts' and presume the user knows what they are doing
            }
            opts = $.extend(opts, options);

            // store these opts onto the body
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
                opts.onLoading();
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
            $(opts.loginBtnSelector).click(function(ev) {
                ev.preventDefault();
                console.log('Clicked login ...');
                showLoading();

                // request an email address
                var params = makeRequestParams(opts);
                params.oncancel = oncancel;
                navigator.id.request(params);
            });

            // when someone clicks the logout button, tell Persona to logout
            $(opts.logoutBtnSelector).click(function(ev) {
                ev.preventDefault();
                console.log('Clicked logout ...');

                // after this is called, the onlogout() event from navigator.id.watch() will be called
                navigator.id.logout();
            });

            // when someone clicks the 'add' button, get a new email address and add it to the server
            $(opts.addBtnSelector).click(function(ev) {
                ev.preventDefault();
                console.log("Clicked 'Add Email' ...");

                // request another email address
                var params = makeRequestParams(opts);
                params.oncancel = oncancel;
                navigator.id.request(params);
            });

            // --- functions ---
            function onlogin(assertion) {
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
                    success: function(result, status, xhr) {
                        // if the result was not ok
                        if ( !result.ok ) {
                            // perhaps have an element (.persona-err) where we show errors?
                            showLoggedOut();
                            return;
                        }

                        // store the email address on $body
                        $body.data('email', result.email);

                        // ... and show it on the page (if opts.showEmailSelector matches any element)
                        $(opts.showEmailSelector).text(result.email);

                        // redirect or show depending on the mode
                        if ( opts.mode === 'classic' ) {
                            if ( opts.setLocationAfterLogin ) {
                                window.location = opts.setLocationAfterLogin;
                            }
                            else {
                                window.location.reload(true);
                            }
                        }
                        else if ( opts.mode === 'application' ) {
                            showLoggedIn();
                            opts.onLogin(result);
                        }
                        else {
                            // unknown mode
                        }
                    },
                    error: function(xhr, status, err) {
                        navigator.id.logout();
                    }
                });
            }

            function match() {
                console.log('match(): entry');
            }

            function oncancel() {
                console.log('oncancel(): entry');
                // this request was cancelled so let's tidy up
                showLoggedOut();
                opts.onCancel();
            }

            function onlogout() {
                // A user has logged out! Here you need to tear down the session by:
                //
                // 1) send the user to another page (which tears down the session on the server)
                // 2) hit an Ajax URL on the server (which also tears down their session)
                //
                // N.B. You see the pattern! :)
                //
                console.log('onlogout(): entry');

                // wipe the email that we think is logged in
                $body.data('email', '');

                if ( opts.mode === 'classic' ) {
                    window.location = opts.logoutUrl;
                }
                else if ( opts.mode === 'application' ) {
                    // hit the logoutJsonUrl, to tear down the local session
                    $.ajax({
                        type: 'POST',
                        url: opts.logoutJsonUrl,
                        success: function(result, status, xhr) {
                            console.log(result);

                            // if the email address is on the page, make it blank
                            $(opts.showEmailSelector).text('');

                            // remove any elements that shouldn't be on the page any longer
                            $(opts.onLogoutDeleteSelector).remove();

                            // show any element we should show when logged out
                            showLoggedOut();

                            // finally, call the listener
                            opts.onLogout();
                        },
                        error: function(xhr, status, err) {
                            // What to do here ... ??? Try and logout using the regular logout.
                            window.location = opts.logoutUrl;
                        }
                    });
                }
                else {
                    // default to setting the location to the logoutUrl
                    window.location = opts.logoutUrl;
                }
            }

            // finally, watch what is going on
            navigator.id.watch({
                loggedInUser : user,
                onlogin      : onlogin,
                match        : match,
                onlogout     : onlogout
            });

            // return this for chained jQuery calls
            return this;
        }

    };

    // plugin 'personaAssistant'
    $.personaAssistant = function(command, options) {

        // Method calling logic
        if ( commands[command] ) {
            return commands[command].apply( this, Array.prototype.slice.call( arguments, 1 ));
        } else if ( typeof command === 'object' || ! command ) {
            return commands.init.apply( this, arguments );
        } else {
            $.error( 'Command ' +  command + ' does not exist on jQuery.personaAssistant' );
        }

    };

    // plugin defaults
    $.personaAssistant.defaults = {
        mode                   : 'classic',

        // queries to show/hide elements at the appropriate time
        loggedInSelector       : '.persona-logged-in',
        loadingSelector        : '.persona-loading',
        loggedOutSelector      : '.persona-logged-out',

        // buttons to log in/out, add an email address
        loginBtnSelector       : '.persona-login',
        logoutBtnSelector      : '.persona-logout',
        addBtnSelector         : '.persona-add',

        // where to set the email we received back (optional)
        showEmailSelector      : '.persona-email',

        // urls we should hit at various times
        loginJsonUrl           : '/login.json',
        logoutUrl              : '/logout',

        // events you can listen on so you can do other things
        onLoading              : function() {},
        onCancel               : function() {}
    };

    // defaults - classic
    $.personaAssistant.classic = {
        // Nothing over and above the regular defaults.
        //
        // Note: we don't listen to any events, since we will usually
        // do a complete page load on login/logout.
    };

    // defaults - application
    $.personaAssistant.application = {
        // urls we should hit at various times
        logoutJsonUrl          : '/logout.json',

        // queries to remove elements from the page when logged out (application
        onLogoutRemoveSelector : '.persona-logout-remove',

        // events you can listen on so you can do something else appropriate
        onLogin                : function(result) {},
        onLogout               : function() {}
    };

})(jQuery);

// ----------------------------------------------------------------------------
