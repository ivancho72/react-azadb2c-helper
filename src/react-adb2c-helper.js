// note on window.msal usage. There is little point holding the object constructed by new Msal.UserAgentApplication
// as the constructor for this class will make callbacks to the acquireToken function and these occur before
// any local assignment can take place. Not nice but its how it works.
import * as Msal from "msal";
import React, { useEffect, useState } from "react";

const state = {
  stopLoopingRedirect: false,
  launchApp: null,
  successCallback: null,
  accessToken: null,
  scopes: [],
  signInAuthority: null,
  resetPassAuthority: null,
};

var appConfig = {
  instance: null,
  tenant: null,
  signInPolicy: null,
  resetPolicy: null,
  applicationId: null,
  cacheLocation: null,
  usePopup: false,
  postLogoutRedirectUri: null,
};

function authCallback(errorDesc) {
  debugger;
  if (errorDesc && errorDesc.message.indexOf("AADB2C90118") > -1) {
    resetPasswordRedirect();
  } else if (errorDesc) {
    console.log(errorDesc);
    state.stopLoopingRedirect = true;
  } else {
    acquireToken();
  }
}

function resetPasswordRedirect() {
  const localMsalApp = window.msal;
  localMsalApp.loginRedirect({
    authority: state.resetPassAuthority,
    scopes: ["openid", "profile"],
  });
}

function resetPasswordPopup() {
  const localMsalApp = window.msal;
  localMsalApp
    .loginPopup({
      authority: state.resetPassAuthority,
      scopes: ["openid", "profile"],
    })
    .then(() => {
      localMsalApp.logout();
    });
}

function acquireToken(successCallback) {
  const localMsalApp = window.msal;
  const user = localMsalApp.getAccount();
  state.successCallback = successCallback;

  if (!user) {
    localMsalApp.loginRedirect({
      authority: state.signInAuthority,
      scopes: ["openid", "profile"],
    });
  } else {
    localMsalApp
      .acquireTokenSilent({
        authority: state.signInAuthority,
        scopes: state.scopes,
      })
      .then(processLogin, (error) => {
        if (error) {
          localMsalApp.acquireTokenRedirect({ scopes: state.scopes });
        }
      });
  }
}

function processLogin(accessToken) {
  state.accessToken = accessToken;
  if (state.launchApp) {
    state.launchApp();
  }

  if (state.successCallback) {
    state.successCallback();
  }

  if (state.userChangeHandler) {
    state.userChangeHandler(accessToken);
  }
}

function acquireTokenPopup(successCallback) {
  const localMsalApp = window.msal;
  const user = localMsalApp.getAccount();
  state.successCallback = successCallback;

  if (!user) {
    localMsalApp
      .loginPopup({ authority: state.signInAuthority, scopes: ["openid", "profile"] })
      .then(processLogin, (error) => {
        if (error && error.toString().indexOf("AADB2C90118") > -1) {
          resetPasswordPopup();
          return;
        }

        console.log(error);
      });
  } else {
    localMsalApp
      .acquireTokenSilent({ authority: state.signInAuthority, scopes: state.scopes })
      .then(processLogin, (error) => {
        if (error) {
          localMsalApp.acquireTokenPopup({ authority: state.signInAuthority, scopes: state.scopes }).then(processLogin);
        }
      });
  }
}

const authAzAdB2c = {
  initialize: (config) => {
    appConfig = config;
    const instance = config.instance ? config.instance : "https://login.microsoftonline.com/tfp/";
    let scopes = config.scopes;
    if (!scopes || scopes.length === 0) {
      console.log(
        "To obtain access tokens you must specify one or more scopes. See https://docs.microsoft.com/en-us/azure/active-directory-b2c/active-directory-b2c-access-tokens"
      );
      state.stopLoopingRedirect = true;
    }
    state.scopes = scopes;
    state.signInAuthority = `${instance}${config.tenant}.onmicrosoft.com/${config.signInPolicy}`;
    state.resetPassAuthority = `${instance}${config.tenant}.onmicrosoft.com/${config.resetPolicy}`;

    //Keep it here for debugging purposes and uncomment the logger instance
    // function logCallback(level, message, pii) {
    //   console.log(`Level: ${level} - Msg: ${message} - pii: ${pii}`);
    // }

    const msalConfig = {
      auth: {
        clientId: config.applicationId,
        authority: state.signInAuthority,
        validateAuthority: false,
        navigateToLoginRequestUrl: true,
        postLogoutRedirectUri: config.postLogoutRedirectUri,
      },
      cache: {
        cacheLocation: config.cacheLocation, // This configures where your cache will be stored
        storeAuthStateInCookie: false, // Set this to "true" to save cache in cookies to address trusted zones limitations in IE (see: https://github.com/AzureAD/microsoft-authentication-library-for-js/wiki/Known-issues-on-IE-and-Edge-Browser)
      },
      system: {
        // logger: new Msal.Logger(logCallback, { level: Msal.LogLevel.Verbose }),
      },
    };

    const localMsalApp = new Msal.UserAgentApplication(msalConfig);
    localMsalApp.handleRedirectCallback(authCallback);
  },
  run: (launchApp) => {
    state.launchApp = launchApp;
    if (
      window.msal.cacheStorage.getItem("login.error") &&
      window.msal.cacheStorage.getItem("login.error").indexOf("AADB2C90118") > -1 &&
      !window.msal.getLoginInProgress()
    ) {
      window.msal.cacheStorage.resetCacheItems();
      resetPasswordRedirect();
    } else if (!window.msal.urlContainsHash(window.location.hash) && window.parent === window && !window.opener) {
      if (!state.stopLoopingRedirect) {
        if (appConfig.usePopup) {
          acquireTokenPopup();
        } else {
          acquireToken();
        }
      }
    }
  },
  required: (WrappedComponent, renderLoading) => {
    return (props) => {
      const [signedIn, setSignedIn] = useState(false);

      useEffect(() => {
        if (
          window.msal.cacheStorage.getItem("login.error") &&
          window.msal.cacheStorage.getItem("login.error").indexOf("AADB2C90118") > -1 &&
          !window.msal.getLoginInProgress()
        ) {
          window.msal.cacheStorage.resetCacheItems();
          window.msal.cacheStorage.setItem("resetPasswordRedirecting", true);
          resetPasswordRedirect();
        } else if (window.msal.cacheStorage.getItem("resetPasswordRedirecting")) {
          window.msal.logout();
        } else if (!signedIn) {
          if (state.accessToken) {
            setSignedIn(true);
          } else if (appConfig.usePopup) {
            acquireTokenPopup(() => setSignedIn(true));
          } else {
            acquireToken(() => setSignedIn(true));
          }
        }
      }, [signedIn]);

      if (signedIn) {
        const accessTokenProps = {
          ...props,
          accessToken: state.accessToken,
        };
        return <WrappedComponent {...accessTokenProps} />;
      } else return typeof renderLoading === "function" ? renderLoading() : null;
    };
  },
  signOut: () => {
    state.accessToken = null;
    window.msal.logout();
  },
  getAccessToken: () => state.accessToken,
  isAuthenticated: () => Boolean(state.accessToken),
  setUserTokenChangeHandler: (userChangeHandler) => {
    state.userChangeHandler = userChangeHandler;
  },
  initiateAccessTokenRequest() {
    if (appConfig.usePopup) {
      acquireTokenPopup();
    } else {
      acquireToken();
    }
  },
};

export default authAzAdB2c;
